


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cancel_order"("p_order_number" "text", "p_phone" "text", "p_reason" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_reason text := trim(coalesce(p_reason, ''));
    v_order  public.orders%rowtype;
begin
    if length(v_reason) < 3 or length(v_reason) > 500 then
        raise exception 'REASON_REQUIRED';
    end if;

    if length(v_digits) < 8 then
        raise exception 'ORDER_NOT_FOUND';
    end if;

    select * into v_order
    from public.orders o
    where upper(o.order_number) = upper(trim(coalesce(p_order_number, '')))
      and right(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), 10)
          = right(v_digits, 10)
    for update;

    if not found then
        raise exception 'ORDER_NOT_FOUND';
    end if;

    if v_order.status not in ('pending', 'processing') then  -- CANCELLABLE
        raise exception 'ORDER_NOT_CANCELLABLE';
    end if;

    update public.orders
    set status        = 'cancelled',
        cancel_reason = v_reason,
        cancelled_at  = now(),
        cancelled_by  = 'customer',
        updated_at    = now()
    where id = v_order.id;

    return public.track_order(p_order_number, p_phone);
end;
$$;


ALTER FUNCTION "public"."cancel_order"("p_order_number" "text", "p_phone" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_store_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_governorate" "text", "p_city" "text", "p_items" "jsonb", "p_customer_email" "text" DEFAULT NULL::"text", "p_shipping_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_order_id bigint;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_shipping_cost numeric(10,2);
  v_total numeric(10,2);
  v_item jsonb;
  v_variant record;
  v_quantity integer;
  v_line_total numeric(10,2);
  v_count integer;
  v_distinct_count integer;
begin
  if coalesce(trim(p_customer_name), '') = ''
     or coalesce(trim(p_customer_phone), '') = ''
     or coalesce(trim(p_shipping_address), '') = ''
     or coalesce(trim(p_governorate), '') = ''
     or coalesce(trim(p_city), '') = '' then
    raise exception 'Customer and shipping details are required';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid cart';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    where jsonb_typeof(i) <> 'object'
       or coalesce(i->>'variant_id', '') !~ '^[1-9][0-9]*$'
       or coalesce(i->>'quantity', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'Invalid cart item';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    where (i->>'quantity')::numeric > 100
  ) then
    raise exception 'Quantity exceeds the allowed limit';
  end if;

  select count(*),
         count(distinct (i->>'variant_id')::bigint)
  into v_count, v_distinct_count
  from jsonb_array_elements(p_items) i;

  if v_count <> v_distinct_count then
    raise exception 'Duplicate variants are not allowed';
  end if;

  -- Lock variants in a consistent order.
  perform pv.id
  from public.product_variants pv
  where pv.id in (
    select (i->>'variant_id')::bigint
    from jsonb_array_elements(p_items) i
  )
  order by pv.id
  for update;

  -- Exact city rate first, then governorate fallback.
  select sr.shipping_cost
  into v_shipping_cost
  from public.shipping_rates sr
  where sr.governorate = trim(p_governorate)
    and sr.is_active = true
    and sr.city in (trim(p_city), '')
  order by case when sr.city = trim(p_city) then 0 else 1 end
  limit 1;

  if not found then
    raise exception 'Shipping is unavailable for this location';
  end if;

  -- Validate variants and calculate subtotal using database prices.
  for v_item in
    select i
    from jsonb_array_elements(p_items) i
    order by (i->>'variant_id')::bigint
  loop
    v_quantity := (v_item->>'quantity')::integer;

    select
      pv.id,
      pv.price,
      pv.stock_quantity,
      pv.is_available,
      p.name as product_name,
      p.is_published,
      pc.name as color_name,
      ps.name as size_name,
      pv.sku
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    join public.product_colors pc on pc.id = pv.color_id
    join public.product_sizes ps on ps.id = pv.size_id
    where pv.id = (v_item->>'variant_id')::bigint;

    if not found then
      raise exception 'A selected product variant does not exist';
    end if;

    if v_variant.is_published is not true
       or v_variant.is_available is not true then
      raise exception 'A selected product is unavailable';
    end if;

    if v_variant.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for variant %', v_variant.id;
    end if;

    v_subtotal := v_subtotal + (v_variant.price * v_quantity);
  end loop;

  v_total := v_subtotal + v_shipping_cost;

  v_order_number :=
    'ORD-' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- Column order matches the values below.
  insert into public.orders (
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_notes,
    subtotal,
    shipping_cost,
    total,
    status,
    payment_method,
    payment_status
  )
  values (
    v_order_number,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    trim(p_customer_phone),
    trim(p_shipping_address),
    trim(p_governorate) || ' - ' || trim(p_city),
    nullif(trim(coalesce(p_shipping_notes, '')), ''),
    v_subtotal,
    v_shipping_cost,
    v_total,
    'pending',
    'cash_on_delivery',
    'unpaid'
  )
  returning id into v_order_id;

  -- Store item snapshots and decrement stock.
  for v_item in
    select i
    from jsonb_array_elements(p_items) i
    order by (i->>'variant_id')::bigint
  loop
    v_quantity := (v_item->>'quantity')::integer;

    select
      pv.id,
      pv.price,
      pv.stock_quantity,
      pv.is_available,
      p.name as product_name,
      p.is_published,
      pc.name as color_name,
      ps.name as size_name,
      pv.sku
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    join public.product_colors pc on pc.id = pv.color_id
    join public.product_sizes ps on ps.id = pv.size_id
    where pv.id = (v_item->>'variant_id')::bigint;

    if v_variant.stock_quantity < v_quantity
       or v_variant.is_available is not true
       or v_variant.is_published is not true then
      raise exception 'Product availability changed; please try again';
    end if;

    v_line_total := v_variant.price * v_quantity;

    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      color_name,
      size_name,
      sku,
      unit_price,
      quantity,
      line_total
    )
    values (
      v_order_id,
      v_variant.id,
      v_variant.product_name,
      v_variant.color_name,
      v_variant.size_name,
      v_variant.sku,
      v_variant.price,
      v_quantity,
      v_line_total
    );

    update public.product_variants
    set stock_quantity = stock_quantity - v_quantity,
        updated_at = now()
    where id = v_variant.id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_cost', v_shipping_cost,
    'total', v_total,
    'payment_method', 'cash_on_delivery',
    'payment_status', 'unpaid'
  );
end;
$_$;


ALTER FUNCTION "public"."create_store_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_governorate" "text", "p_city" "text", "p_items" "jsonb", "p_customer_email" "text", "p_shipping_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_best_selling_products"("result_limit" integer DEFAULT 4) RETURNS TABLE("product_id" bigint, "sold_quantity" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    pv.product_id,
    SUM(oi.quantity)::bigint AS sold_quantity
  FROM public.orders AS o
  JOIN public.order_items AS oi
    ON oi.order_id = o.id
  JOIN public.product_variants AS pv
    ON pv.id = oi.variant_id
  JOIN public.products AS p
    ON p.id = pv.product_id
  WHERE o.status = 'delivered'
    AND p.is_published = true
  GROUP BY pv.product_id
  ORDER BY sold_quantity DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 4), 1), 20);
$$;


ALTER FUNCTION "public"."get_best_selling_products"("result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_best_sellers"("max_items" integer DEFAULT 4) RETURNS json
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select coalesce(json_agg(t), '[]'::json)
    from (
        select
            pv.product_id,
            sum(oi.quantity) as total_quantity
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.product_variants pv on pv.id = oi.variant_id
        where o.status <> 'cancelled'
        group by pv.product_id
        order by sum(oi.quantity) desc
        limit least(greatest(coalesce(max_items, 4), 1), 50)
    ) t;
$$;


ALTER FUNCTION "public"."get_public_best_sellers"("max_items" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select exists (
        select 1 from public.store_admins where user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.store_admins sa
    where sa.user_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."is_store_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_stock_on_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Cancelled orders cannot be reopened';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.product_variants pv
    set stock_quantity = pv.stock_quantity + oi.quantity,
        updated_at = now()
    from public.order_items oi
    where oi.order_id = new.id
      and oi.variant_id = pv.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."restore_stock_on_cancel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_checkout_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_shipping_city" "text", "p_items" "jsonb", "p_customer_email" "text" DEFAULT NULL::"text", "p_shipping_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_order_id bigint;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_shipping_cost numeric(10,2) := 0;
  v_total numeric(10,2);
  v_item jsonb;
  v_variant record;
  v_quantity integer;
  v_line_total numeric(10,2);
  v_unit_price numeric(10,2);
  v_count integer;
  v_distinct_count integer;
begin
  if coalesce(trim(p_customer_name), '') = ''
     or coalesce(trim(p_customer_phone), '') = ''
     or coalesce(trim(p_shipping_address), '') = ''
     or coalesce(trim(p_shipping_city), '') = '' then
    raise exception 'Customer and shipping details are required';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid cart';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    where jsonb_typeof(i) <> 'object'
       or coalesce(i->>'variant_id', '') !~ '^[1-9][0-9]*$'
       or coalesce(i->>'quantity', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'Invalid cart item';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    where (i->>'quantity')::numeric > 100
  ) then
    raise exception 'Quantity exceeds the allowed limit';
  end if;

  select count(*),
         count(distinct (i->>'variant_id')::bigint)
  into v_count, v_distinct_count
  from jsonb_array_elements(p_items) i;

  if v_count <> v_distinct_count then
    raise exception 'Duplicate variants are not allowed';
  end if;

  -- Lock variants in a consistent order.
  perform pv.id
  from public.product_variants pv
  where pv.id in (
    select (i->>'variant_id')::bigint
    from jsonb_array_elements(p_items) i
  )
  order by pv.id
  for update;

  -- Validate variants and calculate subtotal using database prices/discounts (DB time).
  for v_item in
    select i
    from jsonb_array_elements(p_items) i
    order by (i->>'variant_id')::bigint
  loop
    v_quantity := (v_item->>'quantity')::integer;

    select
      pv.id,
      pv.price,
      pv.stock_quantity,
      pv.is_available,
      p.name as product_name,
      p.is_published,
      pc.name as color_name,
      ps.name as size_name,
      pv.sku,
      p.discount_type,
      p.discount_value,
      p.discount_start_at,
      p.discount_end_at
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    join public.product_colors pc on pc.id = pv.color_id
    join public.product_sizes ps on ps.id = pv.size_id
    where pv.id = (v_item->>'variant_id')::bigint;

    if not found then
      raise exception 'A selected product variant does not exist';
    end if;

    if v_variant.is_published is not true
       or v_variant.is_available is not true then
      raise exception 'A selected product is unavailable';
    end if;

    if v_variant.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for variant %', v_variant.id;
    end if;

    v_unit_price := v_variant.price;
    if v_variant.discount_type is not null then
      if (v_variant.discount_start_at is null or now() >= v_variant.discount_start_at)
         and (v_variant.discount_end_at is null or now() < v_variant.discount_end_at) then
        if v_variant.discount_type = 'percentage' then
          v_unit_price := round(v_variant.price * (1 - v_variant.discount_value / 100), 2);
        elsif v_variant.discount_type = 'fixed' then
          v_unit_price := round(v_variant.price - v_variant.discount_value, 2);
        end if;
      end if;
    end if;

    -- A discount that would make the price zero/negative is ignored
    -- (matches the storefront, which then shows the regular price).
    if v_unit_price is null or v_unit_price <= 0 then
      v_unit_price := v_variant.price;
    end if;

    if v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Invalid price for variant %', v_variant.id;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_total := v_subtotal + v_shipping_cost;

  v_order_number :=
    'ORD-' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.orders (
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_notes,
    subtotal,
    shipping_cost,
    total,
    status,
    payment_method,
    payment_status
  )
  values (
    v_order_number,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    trim(p_customer_phone),
    trim(p_shipping_address),
    trim(p_shipping_city),
    nullif(trim(coalesce(p_shipping_notes, '')), ''),
    v_subtotal,
    v_shipping_cost,
    v_total,
    'pending',
    'cash_on_delivery',
    'unpaid'
  )
  returning id into v_order_id;

  -- Store item snapshots and decrement stock.
  for v_item in
    select i
    from jsonb_array_elements(p_items) i
    order by (i->>'variant_id')::bigint
  loop
    v_quantity := (v_item->>'quantity')::integer;

    select
      pv.id,
      pv.price,
      pv.stock_quantity,
      pv.is_available,
      p.name as product_name,
      p.is_published,
      pc.name as color_name,
      ps.name as size_name,
      pv.sku,
      p.discount_type,
      p.discount_value,
      p.discount_start_at,
      p.discount_end_at
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    join public.product_colors pc on pc.id = pv.color_id
    join public.product_sizes ps on ps.id = pv.size_id
    where pv.id = (v_item->>'variant_id')::bigint;

    if v_variant.stock_quantity < v_quantity
       or v_variant.is_available is not true
       or v_variant.is_published is not true then
      raise exception 'Product availability changed; please try again';
    end if;

    v_unit_price := v_variant.price;
    if v_variant.discount_type is not null then
      if (v_variant.discount_start_at is null or now() >= v_variant.discount_start_at)
         and (v_variant.discount_end_at is null or now() < v_variant.discount_end_at) then
        if v_variant.discount_type = 'percentage' then
          v_unit_price := round(v_variant.price * (1 - v_variant.discount_value / 100), 2);
        elsif v_variant.discount_type = 'fixed' then
          v_unit_price := round(v_variant.price - v_variant.discount_value, 2);
        end if;
      end if;
    end if;

    if v_unit_price is null or v_unit_price <= 0 then
      v_unit_price := v_variant.price;
    end if;

    if v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Invalid price for variant %', v_variant.id;
    end if;

    v_line_total := v_unit_price * v_quantity;

    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      color_name,
      size_name,
      sku,
      unit_price,
      quantity,
      line_total
    )
    values (
      v_order_id,
      v_variant.id,
      v_variant.product_name,
      v_variant.color_name,
      v_variant.size_name,
      v_variant.sku,
      v_unit_price,
      v_quantity,
      v_line_total
    );

    update public.product_variants
    set stock_quantity = stock_quantity - v_quantity,
        updated_at = now()
    where id = v_variant.id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_cost', v_shipping_cost,
    'total', v_total,
    'payment_method', 'cash_on_delivery',
    'payment_status', 'unpaid'
  );
end;
$_$;


ALTER FUNCTION "public"."submit_checkout_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_shipping_city" "text", "p_items" "jsonb", "p_customer_email" "text", "p_shipping_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_order"("p_order_number" "text", "p_phone" "text") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_result json;
begin
    if length(v_digits) < 8 or length(trim(coalesce(p_order_number, ''))) = 0 then
        return null;
    end if;

    select json_build_object(
        'order_number',  o.order_number,
        'status',        o.status,
        'created_at',    o.created_at,
        'updated_at',    o.updated_at,
        'subtotal',      o.subtotal,
        'shipping_cost', o.shipping_cost,
        'total',         o.total,
        'shipping_city', o.shipping_city,
        'cancel_reason', o.cancel_reason,
        'cancelled_at',  o.cancelled_at,
        'cancelled_by',  o.cancelled_by,
        'can_cancel',    o.status in ('pending', 'processing'),  -- CANCELLABLE
        'items', coalesce((
            select json_agg(json_build_object(
                'product_name', oi.product_name,
                'color_name',   oi.color_name,
                'size_name',    oi.size_name,
                'quantity',     oi.quantity,
                'unit_price',   oi.unit_price,
                'line_total',   oi.line_total
            ) order by oi.id)
            from public.order_items oi
            where oi.order_id = o.id
        ), '[]'::json)
    )
    into v_result
    from public.orders o
    where upper(o.order_number) = upper(trim(p_order_number))
      and right(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), 10)
          = right(v_digits, 10);

    return v_result;
end;
$$;


ALTER FUNCTION "public"."track_order"("p_order_number" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_product_variant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1
    from public.product_colors c
    join public.product_sizes s
      on s.product_id = c.product_id
    where c.id = new.color_id
      and s.id = new.size_id
      and c.product_id = new.product_id
  ) then
    raise exception
      'Color and size must belong to the same product';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_product_variant"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_messages_email_check" CHECK ((("char_length"("email") >= 3) AND ("char_length"("email") <= 200))),
    CONSTRAINT "contact_messages_message_check" CHECK ((("char_length"("message") >= 10) AND ("char_length"("message") <= 3000))),
    CONSTRAINT "contact_messages_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 120))),
    CONSTRAINT "contact_messages_phone_check" CHECK ((("phone" IS NULL) OR ("char_length"("phone") <= 30)))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


ALTER TABLE "public"."contact_messages" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."contact_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "order_id" bigint NOT NULL,
    "variant_id" bigint,
    "product_name" "text" NOT NULL,
    "color_name" "text",
    "size_name" "text",
    "sku" "text",
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_line_total_check" CHECK (("line_total" >= (0)::numeric)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


ALTER TABLE "public"."order_items" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text",
    "customer_phone" "text" NOT NULL,
    "shipping_address" "text" NOT NULL,
    "shipping_city" "text" NOT NULL,
    "shipping_notes" "text",
    "subtotal" numeric(10,2) NOT NULL,
    "shipping_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text" DEFAULT 'cash_on_delivery'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancel_reason" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "text",
    CONSTRAINT "orders_cancelled_by_check" CHECK (("cancelled_by" = ANY (ARRAY['customer'::"text", 'admin'::"text"]))),
    CONSTRAINT "orders_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash_on_delivery'::"text", 'online'::"text"]))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_shipping_cost_check" CHECK (("shipping_cost" >= (0)::numeric)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


ALTER TABLE "public"."orders" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_colors" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "hex_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_colors_hex_code_check" CHECK (("hex_code" ~ '^#[0-9A-Fa-f]{6}$'::"text"))
);


ALTER TABLE "public"."product_colors" OWNER TO "postgres";


ALTER TABLE "public"."product_colors" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."product_colors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "color_id" bigint,
    "image_url" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


ALTER TABLE "public"."product_images" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."product_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_sizes" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_sizes" OWNER TO "postgres";


ALTER TABLE "public"."product_sizes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."product_sizes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "color_id" bigint NOT NULL,
    "size_id" bigint NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "sku" "text",
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_type" "text",
    "discount_value" numeric,
    "discount_start_at" timestamp with time zone,
    "discount_end_at" timestamp with time zone,
    CONSTRAINT "product_variants_discount_fixed_range" CHECK ((("discount_type" IS DISTINCT FROM 'fixed'::"text") OR (("discount_value" >= (0)::numeric) AND ("discount_value" < "price")))),
    CONSTRAINT "product_variants_discount_percentage_range" CHECK ((("discount_type" IS DISTINCT FROM 'percentage'::"text") OR (("discount_value" >= (0)::numeric) AND ("discount_value" <= (99)::numeric)))),
    CONSTRAINT "product_variants_discount_type_check" CHECK ((("discount_type" IS NULL) OR ("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))),
    CONSTRAINT "product_variants_discount_value_required" CHECK ((("discount_type" IS NULL) OR ("discount_value" IS NOT NULL))),
    CONSTRAINT "product_variants_discount_window_check" CHECK ((("discount_start_at" IS NULL) OR ("discount_end_at" IS NULL) OR ("discount_start_at" <= "discount_end_at"))),
    CONSTRAINT "product_variants_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "product_variants_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


ALTER TABLE "public"."product_variants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."product_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "category_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_price" numeric(10,2) NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_type" "text",
    "discount_value" numeric,
    "discount_start_at" timestamp with time zone,
    "discount_end_at" timestamp with time zone,
    CONSTRAINT "products_base_price_check" CHECK (("base_price" >= (0)::numeric)),
    CONSTRAINT "products_discount_fixed_nonnegative" CHECK ((("discount_type" IS DISTINCT FROM 'fixed'::"text") OR ("discount_value" >= (0)::numeric))),
    CONSTRAINT "products_discount_percentage_range" CHECK ((("discount_type" IS DISTINCT FROM 'percentage'::"text") OR (("discount_value" >= (0)::numeric) AND ("discount_value" <= (99)::numeric)))),
    CONSTRAINT "products_discount_type_check" CHECK ((("discount_type" IS NULL) OR ("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))),
    CONSTRAINT "products_discount_value_required" CHECK ((("discount_type" IS NULL) OR ("discount_value" IS NOT NULL))),
    CONSTRAINT "products_discount_window_check" CHECK ((("discount_start_at" IS NULL) OR ("discount_end_at" IS NULL) OR ("discount_start_at" <= "discount_end_at")))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."shipping_rates" (
    "id" bigint NOT NULL,
    "governorate" "text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "shipping_cost" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shipping_rates_shipping_cost_check" CHECK (("shipping_cost" >= (0)::numeric))
);


ALTER TABLE "public"."shipping_rates" OWNER TO "postgres";


ALTER TABLE "public"."shipping_rates" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."shipping_rates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."store_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_admins" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_address_len" CHECK ((("char_length"("shipping_address") >= 1) AND ("char_length"("shipping_address") <= 500))) NOT VALID;



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_city_len" CHECK ((("char_length"("shipping_city") >= 1) AND ("char_length"("shipping_city") <= 150))) NOT VALID;



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_customer_name_len" CHECK ((("char_length"("customer_name") >= 1) AND ("char_length"("customer_name") <= 120))) NOT VALID;



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_customer_phone_len" CHECK ((("char_length"("customer_phone") >= 8) AND ("char_length"("customer_phone") <= 30))) NOT VALID;



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_email_len" CHECK ((("customer_email" IS NULL) OR ("char_length"("customer_email") <= 200))) NOT VALID;



ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_notes_len" CHECK ((("shipping_notes" IS NULL) OR ("char_length"("shipping_notes") <= 1000))) NOT VALID;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_colors"
    ADD CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_colors"
    ADD CONSTRAINT "product_colors_product_id_name_key" UNIQUE ("product_id", "name");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_sizes"
    ADD CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_sizes"
    ADD CONSTRAINT "product_sizes_product_id_name_key" UNIQUE ("product_id", "name");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_color_id_size_id_key" UNIQUE ("color_id", "size_id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_rates"
    ADD CONSTRAINT "shipping_rates_governorate_city_key" UNIQUE ("governorate", "city");



ALTER TABLE ONLY "public"."shipping_rates"
    ADD CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_admins"
    ADD CONSTRAINT "store_admins_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_variant_id" ON "public"."order_items" USING "btree" ("variant_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_product_images_color_id" ON "public"."product_images" USING "btree" ("color_id");



CREATE UNIQUE INDEX "idx_product_images_one_primary" ON "public"."product_images" USING "btree" ("product_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_product_images_product_id" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "idx_product_variants_product_id" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_product_variants_size_id" ON "public"."product_variants" USING "btree" ("size_id");



CREATE INDEX "idx_products_category_published" ON "public"."products" USING "btree" ("category_id") WHERE "is_published";



CREATE OR REPLACE TRIGGER "check_product_variant_relationship" BEFORE INSERT OR UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."validate_product_variant"();



CREATE OR REPLACE TRIGGER "trg_restore_stock_on_cancel" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."restore_stock_on_cancel"();



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_colors"
    ADD CONSTRAINT "product_colors_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "public"."product_colors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_sizes"
    ADD CONSTRAINT "product_sizes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "public"."product_colors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "public"."product_sizes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."store_admins"
    ADD CONSTRAINT "store_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view active shipping rates" ON "public"."shipping_rates" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Anyone can view categories with published products" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."category_id" = "categories"."id") AND ("p"."is_published" = true)))));



CREATE POLICY "Anyone can view colors of published products" ON "public"."product_colors" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_colors"."product_id") AND ("p"."is_published" = true)))));



CREATE POLICY "Anyone can view images of published products" ON "public"."product_images" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_images"."product_id") AND ("p"."is_published" = true)))));



CREATE POLICY "Anyone can view published products" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "Anyone can view sizes of published products" ON "public"."product_sizes" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_sizes"."product_id") AND ("p"."is_published" = true)))));



CREATE POLICY "Anyone can view variants of published products" ON "public"."product_variants" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_variants"."product_id") AND ("p"."is_published" = true)))));



CREATE POLICY "Store admins manage categories" ON "public"."categories" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage order items" ON "public"."order_items" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage orders" ON "public"."orders" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage product colors" ON "public"."product_colors" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage product images" ON "public"."product_images" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage product sizes" ON "public"."product_sizes" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage product variants" ON "public"."product_variants" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage products" ON "public"."products" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "Store admins manage shipping rates" ON "public"."shipping_rates" TO "authenticated" USING (( SELECT "public"."is_store_admin"() AS "is_store_admin")) WITH CHECK (( SELECT "public"."is_store_admin"() AS "is_store_admin"));



CREATE POLICY "admins delete contact messages" ON "public"."contact_messages" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read contact messages" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read own row" ON "public"."store_admins" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "admins update contact messages" ON "public"."contact_messages" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "anyone can send contact message" ON "public"."contact_messages" FOR INSERT TO "authenticated", "anon" WITH CHECK (("is_read" = false));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_colors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_sizes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_admins" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_order"("p_order_number" "text", "p_phone" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_number" "text", "p_phone" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_number" "text", "p_phone" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_store_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_governorate" "text", "p_city" "text", "p_items" "jsonb", "p_customer_email" "text", "p_shipping_notes" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."get_best_selling_products"("result_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_best_selling_products"("result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_best_selling_products"("result_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_public_best_sellers"("max_items" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_best_sellers"("max_items" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_best_sellers"("max_items" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_store_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_store_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."restore_stock_on_cancel"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."submit_checkout_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_shipping_city" "text", "p_items" "jsonb", "p_customer_email" "text", "p_shipping_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_checkout_order"("p_customer_name" "text", "p_customer_phone" "text", "p_shipping_address" "text", "p_shipping_city" "text", "p_items" "jsonb", "p_customer_email" "text", "p_shipping_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."track_order"("p_order_number" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_order"("p_order_number" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_order"("p_order_number" "text", "p_phone" "text") TO "authenticated";



GRANT SELECT,MAINTAIN ON TABLE "public"."categories" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."categories" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."categories_id_seq" TO "anon";



GRANT INSERT,MAINTAIN ON TABLE "public"."contact_messages" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."contact_messages" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_messages" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."contact_messages_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."contact_messages_id_seq" TO "authenticated";



GRANT MAINTAIN ON TABLE "public"."order_items" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."order_items" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."order_items_id_seq" TO "anon";



GRANT MAINTAIN ON TABLE "public"."orders" TO "anon";
GRANT SELECT,MAINTAIN,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."orders_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."product_colors" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."product_colors" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_colors" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."product_colors_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."product_colors_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."product_images" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."product_images" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_images" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."product_images_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."product_images_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."product_sizes" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."product_sizes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_sizes" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."product_sizes_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."product_sizes_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."product_variants" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."product_variants" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_variants" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."product_variants_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."products" TO "anon";
GRANT SELECT,INSERT,MAINTAIN,UPDATE ON TABLE "public"."products" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."products_id_seq" TO "anon";



GRANT SELECT,MAINTAIN ON TABLE "public"."shipping_rates" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."shipping_rates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shipping_rates" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."shipping_rates_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."shipping_rates_id_seq" TO "anon";



GRANT MAINTAIN ON TABLE "public"."store_admins" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."store_admins" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."store_admins" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







