import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
    addProductVariant,
    deleteColor,
    deleteProductImage,
    deleteSize,
    deleteVariant,
    getProductOptions,
    setImageColor,
    setPrimaryImage,
    updateColor,
    updateSize,
    updateVariant,
    uploadProductImages,
} from "../../services/adminProductService";
import formatPrice from "../../utils/formatPrice";

const inputClass =
    "rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm";

function Section({ title, hint, children }) {
    return (
        <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[var(--color-text-strong)]">{title}</h2>
            {hint && <p className="mt-1 text-sm text-[var(--color-muted)]">{hint}</p>}
            {children}
        </section>
    );
}

/* ------------------------------ Colors ------------------------------ */

function ColorRow({ color, run }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(color.name);
    const [hex, setHex] = useState(color.hex_code || "#000000");
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        const ok = await run(() => updateColor(color.id, { name, hex_code: hex }));
        setBusy(false);

        if (ok) setEditing(false);
    }

    async function remove() {
        if (
            !window.confirm(
                `حذف اللون «${color.name}»؟ كل الـ variants المرتبطة بيه هتتحذف كمان.`
            )
        ) {
            return;
        }

        setBusy(true);
        await run(() => deleteColor(color.id));
        setBusy(false);
    }

    if (editing) {
        return (
            <li className="flex flex-wrap items-center gap-2 py-3">
                <input
                    type="color"
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    aria-label="كود اللون"
                    className="h-9 w-12 cursor-pointer rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1"
                />
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="اسم اللون"
                    className={`${inputClass} w-40`}
                />
                <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="rounded-lg bg-[var(--color-navy)] px-3 py-2 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                    حفظ
                </button>
                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-2 text-sm font-semibold text-[var(--color-text-muted)]"
                >
                    إلغاء
                </button>
            </li>
        );
    }

    return (
        <li className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className="h-6 w-6 rounded-full border border-[var(--color-border-strong)]"
                    style={{ backgroundColor: color.hex_code || "var(--color-surface)" }}
                />
                <span className="font-semibold text-[var(--color-text-strong)]">{color.name}</span>
                <span dir="ltr" className="text-xs text-[var(--color-subtle)]">
                    {color.hex_code}
                </span>
            </span>

            <span className="flex gap-4 text-sm font-semibold">
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-[var(--color-primary)] hover:underline"
                >
                    تعديل
                </button>
                <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="text-[var(--color-rose-600)] hover:underline disabled:opacity-50"
                >
                    حذف
                </button>
            </span>
        </li>
    );
}

function ColorsSection({ colors, run }) {
    return (
        <Section
            title="الألوان"
            hint="الألوان بتتضاف تلقائيًا لما تكتبها في فورم الإضافة فوق. من هنا تقدر تغيّر اسم اللون أو درجته أو تحذفه."
        >
            {colors.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-muted)]">لسه مفيش ألوان.</p>
            ) : (
                <ul className="mt-2 divide-y bg">
                    {colors.map((color) => (
                        <ColorRow key={color.id} color={color} run={run} />
                    ))}
                </ul>
            )}
        </Section>
    );
}

/* ------------------------------ Sizes ------------------------------- */

function SizeRow({ size, run }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(size.name);
    const [order, setOrder] = useState(size.sort_order ?? 0);
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        const ok = await run(() => updateSize(size.id, { name, sort_order: order }));
        setBusy(false);

        if (ok) setEditing(false);
    }

    async function remove() {
        if (
            !window.confirm(
                `حذف المقاس «${size.name}»؟ كل الـ variants المرتبطة بيه هتتحذف كمان.`
            )
        ) {
            return;
        }

        setBusy(true);
        await run(() => deleteSize(size.id));
        setBusy(false);
    }

    if (editing) {
        return (
            <li className="flex flex-wrap items-center gap-2 py-3">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="اسم المقاس"
                    className={`${inputClass} w-32`}
                />
                <input
                    type="number"
                    step="1"
                    dir="ltr"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    aria-label="الترتيب"
                    className={`${inputClass} w-20 text-start`}
                />
                <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="rounded-lg bg-[var(--color-navy)] px-3 py-2 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                    حفظ
                </button>
                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-2 text-sm font-semibold text-[var(--color-text-muted)]"
                >
                    إلغاء
                </button>
            </li>
        );
    }

    return (
        <li className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3">
                <span className="font-semibold text-[var(--color-text-strong)]">{size.name}</span>
                <span className="text-xs text-[var(--color-subtle)]">الترتيب {size.sort_order ?? 0}</span>
            </span>

            <span className="flex gap-4 text-sm font-semibold">
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-[var(--color-primary)] hover:underline"
                >
                    تعديل
                </button>
                <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="text-[var(--color-rose-600)] hover:underline disabled:opacity-50"
                >
                    حذف
                </button>
            </span>
        </li>
    );
}

function SizesSection({ sizes, run }) {
    return (
        <Section
            title="المقاسات"
            hint="المقاسات بتتضاف تلقائيًا لما تكتبها في فورم الإضافة فوق وبتظهر للعميل بترتيبها. من هنا تقدر تغيّر الاسم أو الترتيب أو تحذف."
        >
            {sizes.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-muted)]">لسه مفيش مقاسات.</p>
            ) : (
                <ul className="mt-2 divide-y bg">
                    {sizes.map((size) => (
                        <SizeRow key={size.id} size={size} run={run} />
                    ))}
                </ul>
            )}
        </Section>
    );
}

/* ----------------------------- Variants ----------------------------- */

function VariantRow({ variant, label, basePrice, run }) {
    const [price, setPrice] = useState(variant.price ?? basePrice ?? 0);
    const [stock, setStock] = useState(variant.stock_quantity ?? 0);
    const [sku, setSku] = useState(variant.sku ?? "");
    const [available, setAvailable] = useState(Boolean(variant.is_available));
    const [busy, setBusy] = useState(false);

    const dirty =
        Number(price) !== Number(variant.price ?? basePrice ?? 0) ||
        Number(stock) !== Number(variant.stock_quantity ?? 0) ||
        sku !== (variant.sku ?? "") ||
        available !== Boolean(variant.is_available);

    async function save() {
        setBusy(true);
        await run(() =>
            updateVariant(variant.id, {
                price,
                stock_quantity: stock,
                sku,
                is_available: available,
            })
        );
        setBusy(false);
    }

    async function remove() {
        if (!window.confirm(`حذف «${label}»؟`)) return;

        setBusy(true);
        await run(() => deleteVariant(variant.id));
        setBusy(false);
    }

    return (
        <tr className="border-b border-[var(--color-border-soft)] last:border-0">
            <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{label}</td>
            <td className="px-3 py-2">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    aria-label={`سعر ${label}`}
                    className={`${inputClass} w-28 text-start`}
                />
            </td>
            <td className="px-3 py-2">
                <input
                    type="number"
                    min="0"
                    step="1"
                    dir="ltr"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    aria-label={`مخزون ${label}`}
                    className={`${inputClass} w-20 text-start`}
                />
            </td>
            <td className="px-3 py-2">
                <input
                    dir="ltr"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    aria-label={`SKU ${label}`}
                    className={`${inputClass} w-44 text-start`}
                />
            </td>
            <td className="px-3 py-2">
                <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    aria-label={`متاح ${label}`}
                    className="h-4 w-4"
                />
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-3 text-sm font-semibold">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!dirty || busy}
                        className="rounded-lg bg-[var(--color-navy)] px-3 py-1.5 font-bold text-[var(--color-on-primary)] disabled:bg-[var(--color-slate-200)] disabled:text-[var(--color-subtle)]"
                    >
                        حفظ
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        disabled={busy}
                        className="text-[var(--color-rose-600)] hover:underline disabled:opacity-50"
                    >
                        حذف
                    </button>
                </div>
            </td>
        </tr>
    );
}

function VariantsSection({ product, run }) {
    const { colors, sizes, variants } = product;

    const [colorName, setColorName] = useState("");
    const [hex, setHex] = useState("#3985f6");
    const [sizeName, setSizeName] = useState("");
    const [price, setPrice] = useState(product.base_price ?? "");
    const [stock, setStock] = useState("");
    const [busy, setBusy] = useState(false);

    const colorNames = useMemo(
        () => new Map(colors.map((color) => [color.id, color.name])),
        [colors]
    );
    const sizeNames = useMemo(
        () => new Map(sizes.map((size) => [size.id, size.name])),
        [sizes]
    );

    const existingColor = colors.find(
        (color) =>
            color.name.trim().toLowerCase() === colorName.trim().toLowerCase()
    );

    async function handleAdd(event) {
        event.preventDefault();
        setBusy(true);

        const ok = await run(() =>
            addProductVariant(product, {
                colorName,
                hex_code: existingColor?.hex_code || hex,
                sizeName,
                price,
                stock_quantity: stock,
            })
        );

        setBusy(false);

        // Keep color and price so several sizes of one color are quick to enter.
        if (ok) {
            setSizeName("");
            setStock("");
        }
    }

    function labelFor(variant) {
        return (
            [colorNames.get(variant.color_id), sizeNames.get(variant.size_id)]
                .filter(Boolean)
                .join(" / ") || "بدون لون أو مقاس"
        );
    }

    const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]";

    return (
        <Section
            title="إضافة لون ومقاس"
            hint={`اكتب اللون والمقاس والسعر والكمية واضغط إضافة. العميل بيشوف بس اللي كميته أكبر من صفر. السعر الأساسي للمنتج ${formatPrice(
                product.base_price
            )}.`}
        >
            <form
                onSubmit={handleAdd}
                className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end"
            >
                <div>
                    <label htmlFor="variant-color" className={labelClass}>
                        اللون
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={existingColor?.hex_code || hex}
                            onChange={(e) => setHex(e.target.value)}
                            disabled={Boolean(existingColor)}
                            aria-label="درجة اللون"
                            title={
                                existingColor
                                    ? "اللون ده موجود، درجته محفوظة"
                                    : "اختار درجة اللون"
                            }
                            className="h-10 w-12 shrink-0 cursor-pointer rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <input
                            id="variant-color"
                            list="variant-color-list"
                            value={colorName}
                            onChange={(e) => setColorName(e.target.value)}
                            placeholder="مثال: Navy"
                            required
                            className={`${inputClass} min-w-0 flex-1`}
                        />
                    </div>
                    <datalist id="variant-color-list">
                        {colors.map((color) => (
                            <option key={color.id} value={color.name} />
                        ))}
                    </datalist>
                </div>

                <div>
                    <label htmlFor="variant-size" className={labelClass}>
                        المقاس
                    </label>
                    <input
                        id="variant-size"
                        list="variant-size-list"
                        value={sizeName}
                        onChange={(e) => setSizeName(e.target.value)}
                        placeholder="مثال: 2-3Y"
                        required
                        className={`${inputClass} w-full`}
                    />
                    <datalist id="variant-size-list">
                        {sizes.map((size) => (
                            <option key={size.id} value={size.name} />
                        ))}
                    </datalist>
                </div>

                <div>
                    <label htmlFor="variant-price" className={labelClass}>
                        السعر (EGP)
                    </label>
                    <input
                        id="variant-price"
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className={`${inputClass} w-full text-start`}
                    />
                </div>

                <div>
                    <label htmlFor="variant-stock" className={labelClass}>
                        الكمية
                    </label>
                    <input
                        id="variant-stock"
                        type="number"
                        min="0"
                        step="1"
                        dir="ltr"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        required
                        className={`${inputClass} w-full text-start`}
                    />
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-[var(--color-navy)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
                >
                    {busy ? "جاري الإضافة..." : "إضافة"}
                </button>
            </form>

            {variants.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--color-muted)]">
                    لسه مفيش ألوان ومقاسات للمنتج ده. أضف أول واحد من الفورم فوق.
                </p>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-muted)]">
                                <th className="px-3 py-2 text-start font-semibold">اللون / المقاس</th>
                                <th className="px-3 py-2 text-start font-semibold">السعر (EGP)</th>
                                <th className="px-3 py-2 text-start font-semibold">الكمية</th>
                                <th className="px-3 py-2 text-start font-semibold">SKU</th>
                                <th className="px-3 py-2 text-start font-semibold">متاح</th>
                                <th className="px-3 py-2">
                                    <span className="sr-only">إجراءات</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map((variant) => (
                                <VariantRow
                                    key={variant.id}
                                    variant={variant}
                                    label={labelFor(variant)}
                                    basePrice={product.base_price}
                                    run={run}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

/* ------------------------------ Images ------------------------------ */

function ImagesSection({ product, run }) {
    const { images, colors } = product;
    const [uploadColor, setUploadColor] = useState("");
    const [uploading, setUploading] = useState(false);
    const [busyId, setBusyId] = useState(null);

    async function handleFiles(event) {
        const files = Array.from(event.target.files ?? []);

        event.target.value = "";

        if (!files.length) return;

        setUploading(true);

        await run(() =>
            uploadProductImages(
                product.id,
                product.name,
                files,
                uploadColor ? Number(uploadColor) : null
            )
        );

        setUploading(false);
    }

    async function withImage(image, action) {
        setBusyId(image.id);
        await run(action);
        setBusyId(null);
    }

    function handleDelete(image) {
        if (!window.confirm("حذف الصورة دي؟")) return;

        withImage(image, () => deleteProductImage(image));
    }

    return (
        <Section
            title="الصور"
            hint="الصورة الرئيسية هي اللي بتظهر في قايمة المنتجات. لو ربطت صورة بلون، العميل لما يختار اللون ده بيشوف الصورة دي. JPG أو PNG أو WebP، لحد 5 ميجا للصورة."
        >
            <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                    <label
                        htmlFor="upload-color"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        الصور الجديدة تتربط بـ
                    </label>
                    <select
                        id="upload-color"
                        value={uploadColor}
                        onChange={(e) => setUploadColor(e.target.value)}
                        className={`${inputClass} w-48`}
                    >
                        <option value="">كل الألوان (عامة)</option>
                        {colors.map((color) => (
                            <option key={color.id} value={color.id}>
                                {color.name}
                            </option>
                        ))}
                    </select>
                </div>

                <label
                    className={[
                        "cursor-pointer rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)]",
                        uploading ? "pointer-events-none opacity-60" : "",
                    ].join(" ")}
                >
                    {uploading ? "جاري الرفع..." : "اختار صور وارفعها"}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFiles}
                        disabled={uploading}
                        className="sr-only"
                    />
                </label>
            </div>

            {images.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--color-muted)]">
                    لسه مفيش صور للمنتج ده.
                </p>
            ) : (
                <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {images.map((image) => {
                        const busy = busyId === image.id;

                        return (
                            <li
                                key={image.id}
                                className="overflow-hidden rounded-xl border border-[var(--color-border)]"
                            >
                                <div className="relative aspect-square bg-[var(--color-slate-100)]">
                                    <img
                                        src={image.image_url}
                                        alt={image.alt_text || product.name}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
                                    {image.is_primary && (
                                        <span className="absolute start-2 top-2 rounded-full bg-[var(--color-success)] px-2 py-0.5 text-xs font-bold text-[var(--color-on-primary)]">
                                            رئيسية
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 p-3">
                                    <select
                                        value={image.color_id ?? ""}
                                        disabled={busy}
                                        onChange={(e) =>
                                            withImage(image, () =>
                                                setImageColor(
                                                    image.id,
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : null
                                                )
                                            )
                                        }
                                        aria-label="لون الصورة"
                                        className={`${inputClass} w-full py-1.5`}
                                    >
                                        <option value="">كل الألوان</option>
                                        {colors.map((color) => (
                                            <option key={color.id} value={color.id}>
                                                {color.name}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex items-center justify-between text-sm font-semibold">
                                        {image.is_primary ? (
                                            <span className="text-[var(--color-subtle)]">
                                                الصورة الرئيسية
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                    withImage(image, () =>
                                                        setPrimaryImage(product.id, image.id)
                                                    )
                                                }
                                                className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
                                            >
                                                اجعلها رئيسية
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => handleDelete(image)}
                                            className="text-[var(--color-rose-600)] hover:underline disabled:opacity-50"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Section>
    );
}

/* ------------------------------- Page -------------------------------- */

export default function ProductVariants() {
    const { id } = useParams();
    const location = useLocation();
    const notice = location.state?.notice || "";

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");

    const load = useCallback(async () => {
        try {
            const data = await getProductOptions(id);

            setProduct(data);
            setError(data ? "" : "المنتج ده مش موجود.");
        } catch (err) {
            setError(err.message || "تعذر تحميل المنتج.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    // Runs a change, reloads the data, and reports success.
    const run = useCallback(
        async (action) => {
            setActionError("");

            try {
                await action();
                await load();

                return true;
            } catch (err) {
                setActionError(err.message || "حصلت مشكلة. حاول تاني.");

                return false;
            }
        },
        [load]
    );

    return (
        <div>
            <Link
                to="/admin/products"
                className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
                رجوع للمنتجات
            </Link>

            {loading && <p className="mt-6 text-sm text-[var(--color-muted)]">جاري التحميل...</p>}

            {error && (
                <p role="alert" className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]">
                    {error}
                </p>
            )}

            {product && (
                <>
                    <h1 className="mt-3 text-2xl font-bold text-[var(--color-text-strong)]">
                        {product.name}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        الألوان والمقاسات والأسعار والكميات والصور.
                    </p>

                    {notice && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]"
                        >
                            {notice}
                        </p>
                    )}

                    {actionError && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                        >
                            {actionError}
                        </p>
                    )}

                    <VariantsSection product={product} run={run} />
                    <ImagesSection product={product} run={run} />
                    <ColorsSection colors={product.colors} run={run} />
                    <SizesSection sizes={product.sizes} run={run} />
                </>
            )}
        </div>
    );
}
