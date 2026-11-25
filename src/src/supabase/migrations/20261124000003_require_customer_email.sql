-- Require a valid customer email for every new checkout order.
-- Existing orders are retained as-is; older rows may have no email.
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

  if coalesce(trim(p_customer_email), '') = ''
     or trim(p_customer_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$' then
    raise exception 'A valid customer email is required';
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



-- The existing orders RLS policy restricts customer/order data to store admins.
