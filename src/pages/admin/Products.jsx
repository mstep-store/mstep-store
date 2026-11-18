import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
    createProduct,
    getAdminProducts,
    getCategories,
    setProductPublished,
    updateProduct,
    uploadProductImages,
    validateImageFile,
} from "../../services/adminProductService";
import formatPrice from "../../utils/formatPrice";
import { describeDiscount, getDiscountStatus } from "../../utils/pricing";

// ISO timestamp -> value for <input type="datetime-local"> (local time).
function toLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DISCOUNT_STATUS_LABELS = {
    active: "شغّال",
    scheduled: "مجدول",
    expired: "منتهي",
};

const EMPTY_FORM = {
    name: "",
    description: "",
    base_price: "",
    category_id: "",
    is_published: false,
    discount_type: "",
    discount_value: "",
    discount_start_at: "",
    discount_end_at: "",
};

function ProductForm({ product, categories, onCancel, onSaved }) {
    const isEditing = Boolean(product);

    const [form, setForm] = useState(
        product
            ? {
                  name: product.name ?? "",
                  description: product.description ?? "",
                  base_price: product.base_price ?? "",
                  category_id: product.category_id ?? "",
                  is_published: Boolean(product.is_published),
                  discount_type: product.discount_type ?? "",
                  discount_value: product.discount_value ?? "",
                  discount_start_at: toLocalInput(product.discount_start_at),
                  discount_end_at: toLocalInput(product.discount_end_at),
              }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Images picked while adding a new product (uploaded right after saving).
    const [files, setFiles] = useState([]);
    const [fileError, setFileError] = useState("");

    const previews = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files]
    );

    useEffect(() => {
        return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [previews]);

    function handlePickFiles(event) {
        const picked = Array.from(event.target.files ?? []);

        event.target.value = "";
        setFileError("");

        try {
            picked.forEach(validateImageFile);
        } catch (err) {
            setFileError(err.message);

            return;
        }

        setFiles((current) => [...current, ...picked]);
    }

    function removeFile(index) {
        setFiles((current) => current.filter((_, i) => i !== index));
    }

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSaving(true);

        try {
            if (isEditing) {
                await updateProduct(product.id, form);
                await onSaved();
            } else {
                const created = await createProduct(form);
                let imageError = "";

                if (files.length) {
                    try {
                        await uploadProductImages(created.id, form.name, files);
                    } catch (err) {
                        imageError = `المنتج اتحفظ، بس الصور ما اترفعتش: ${err.message}`;
                    }
                }

                await onSaved(created?.id, imageError);
            }
        } catch (err) {
            setError(err.message || "تعذر حفظ المنتج.");
            setSaving(false);
        }
    }

    const inputClass =
        "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm";

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
        >
            <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                {isEditing ? `تعديل: ${product.name}` : "منتج جديد"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label
                        htmlFor="product-name"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        اسم المنتج
                    </label>
                    <input
                        id="product-name"
                        required
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label
                        htmlFor="product-price"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        السعر الأساسي (EGP)
                    </label>
                    <input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        dir="ltr"
                        value={form.base_price}
                        onChange={(e) => setField("base_price", e.target.value)}
                        className={`${inputClass} text-start`}
                    />
                </div>

                <div>
                    <label
                        htmlFor="product-category"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        التصنيف
                    </label>
                    <select
                        id="product-category"
                        value={form.category_id}
                        onChange={(e) => setField("category_id", e.target.value)}
                        className={inputClass}
                    >
                        <option value="">بدون تصنيف</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label
                        htmlFor="product-description"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        الوصف
                    </label>
                    <textarea
                        id="product-description"
                        rows={4}
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        className={inputClass}
                    />
                </div>

                <fieldset className="rounded-lg border border-[var(--color-border)] p-4 sm:col-span-2">
                    <legend className="px-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                        الخصم على المنتج كله
                    </legend>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="product-discount-type"
                                className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                            >
                                نوع الخصم
                            </label>
                            <select
                                id="product-discount-type"
                                value={form.discount_type}
                                onChange={(e) =>
                                    setField("discount_type", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">بدون خصم</option>
                                <option value="percentage">نسبة مئوية (%)</option>
                                <option value="fixed">مبلغ ثابت (EGP)</option>
                            </select>
                        </div>

                        {form.discount_type && (
                            <div>
                                <label
                                    htmlFor="product-discount-value"
                                    className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    {form.discount_type === "percentage"
                                        ? "نسبة الخصم (1 – 99)"
                                        : "قيمة الخصم (EGP)"}
                                </label>
                                <input
                                    id="product-discount-value"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    dir="ltr"
                                    value={form.discount_value}
                                    onChange={(e) =>
                                        setField("discount_value", e.target.value)
                                    }
                                    className={`${inputClass} text-start`}
                                />
                            </div>
                        )}

                        {form.discount_type && (
                            <>
                                <div>
                                    <label
                                        htmlFor="product-discount-start"
                                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                    >
                                        يبدأ من (اختياري)
                                    </label>
                                    <input
                                        id="product-discount-start"
                                        type="datetime-local"
                                        dir="ltr"
                                        value={form.discount_start_at}
                                        onChange={(e) =>
                                            setField(
                                                "discount_start_at",
                                                e.target.value
                                            )
                                        }
                                        className={`${inputClass} text-start`}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="product-discount-end"
                                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                    >
                                        ينتهي في (اختياري)
                                    </label>
                                    <input
                                        id="product-discount-end"
                                        type="datetime-local"
                                        dir="ltr"
                                        value={form.discount_end_at}
                                        onChange={(e) =>
                                            setField(
                                                "discount_end_at",
                                                e.target.value
                                            )
                                        }
                                        className={`${inputClass} text-start`}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <p className="mt-3 text-xs text-[var(--color-muted)]">
                        الخصم بيتطبق على سعر كل ألوان ومقاسات المنتج. بداية
                        الخصم شاملة ونهايته غير شاملة. لإلغاء الخصم اختار
                        «بدون خصم» واحفظ.
                    </p>
                </fieldset>

                {isEditing && (
                    <p className="text-sm text-[var(--color-muted)] sm:col-span-2">
                        الصور والألوان والمقاسات بتتعدّل من صفحة «الألوان
                        والمقاسات والصور» للمنتج.
                    </p>
                )}

                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={(e) => setField("is_published", e.target.checked)}
                        className="h-4 w-4"
                    />
                    منشور في المتجر
                </label>
            </div>

            {!isEditing && (
                <div className="mt-5">
                    <p className="mb-1.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                        صور المنتج
                    </p>

                    <label className="inline-block cursor-pointer rounded-lg border border-dashed border-[var(--color-slate-400)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]">
                        اختار صور
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handlePickFiles}
                            disabled={saving}
                            className="sr-only"
                        />
                    </label>
                    <span className="ms-3 text-xs text-[var(--color-subtle)]">
                        JPG أو PNG أو WebP، لحد 5 ميجا. أول صورة هي الرئيسية.
                    </span>

                    {fileError && (
                        <p
                            role="alert"
                            className="mt-2 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                        >
                            {fileError}
                        </p>
                    )}

                    {previews.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-3">
                            {previews.map((preview, index) => (
                                <li key={preview.url} className="relative">
                                    <img
                                        src={preview.url}
                                        alt={preview.file.name}
                                        className="h-20 w-20 rounded-lg object-cover"
                                    />
                                    {index === 0 && (
                                        <span className="absolute start-1 top-1 rounded bg-[var(--color-success)] px-1.5 text-[10px] font-bold text-[var(--color-on-primary)]">
                                            رئيسية
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        disabled={saving}
                                        aria-label={`شيل ${preview.file.name}`}
                                        className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-slate-800)] text-sm text-[var(--color-on-primary)]"
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {!isEditing && (
                <p className="mt-4 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]">
                    بعد الحفظ هننقلك لصفحة الألوان والمقاسات والكميات، عشان
                    العملاء يقدروا يشتروا المنتج.
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-4 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                >
                    {error}
                </p>
            )}

            <div className="mt-5 flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--color-navy)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
                >
                    {saving ? "جاري الحفظ..." : "حفظ المنتج"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="rounded-lg border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]"
                >
                    إلغاء
                </button>
            </div>
        </form>
    );
}

export default function AdminProducts() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // null = closed, "new" = creating, product object = editing
    const [editing, setEditing] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [actionError, setActionError] = useState("");

    const load = useCallback(async () => {
        try {
            const [productsData, categoriesData] = await Promise.all([
                getAdminProducts(),
                getCategories(),
            ]);

            setProducts(productsData);
            setCategories(categoriesData);
            setError("");
        } catch (err) {
            setError(err.message || "تعذر تحميل المنتجات.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function handleSaved(newProductId, imageError) {
        await load();
        setEditing(null);

        if (newProductId != null) {
            navigate(`/admin/products/${newProductId}/variants`, {
                state: imageError ? { notice: imageError } : undefined,
            });
        }
    }

    async function handleTogglePublished(product) {
        setTogglingId(product.id);
        setActionError("");

        try {
            await setProductPublished(product.id, !product.is_published);

            setProducts((current) =>
                current.map((item) =>
                    item.id === product.id
                        ? { ...item, is_published: !product.is_published }
                        : item
                )
            );
        } catch (err) {
            setActionError(err.message || "تعذر تغيير حالة النشر.");
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">
                        المنتجات
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {products.length} منتج، المنشور منهم{" "}
                        {products.filter((p) => p.is_published).length}.
                    </p>
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)]"
                    >
                        إضافة منتج
                    </button>
                )}
            </div>

            {editing && (
                <ProductForm
                    key={editing === "new" ? "new" : editing.id}
                    product={editing === "new" ? null : editing}
                    categories={categories}
                    onCancel={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            {loading && (
                <p className="mt-8 text-sm text-[var(--color-muted)]">جاري التحميل...</p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                >
                    {error}
                </p>
            )}

            {actionError && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                >
                    {actionError}
                </p>
            )}

            {!loading && !error && products.length === 0 && (
                <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
                    لسه مفيش منتجات. اضغط «إضافة منتج» وابدأ بأول منتج.
                </p>
            )}

            {!loading && products.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <table className="w-full min-w-[40rem] text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-page)] text-xs text-[var(--color-muted)]">
                                <th className="px-4 py-3 text-start font-semibold">
                                    المنتج
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    التصنيف
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    السعر
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    المخزون
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    النشر
                                </th>
                                <th className="px-4 py-3">
                                    <span className="sr-only">إجراءات</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr
                                    key={product.id}
                                    className="border-b border-[var(--color-border-soft)] last:border-0"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.thumbnail ? (
                                                <img
                                                    src={product.thumbnail.image_url}
                                                    alt={
                                                        product.thumbnail.alt_text ||
                                                        product.name
                                                    }
                                                    loading="lazy"
                                                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div
                                                    aria-hidden="true"
                                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-slate-100)] text-[10px] text-[var(--color-subtle)]"
                                                >
                                                    بدون صورة
                                                </div>
                                            )}
                                            <span className="font-semibold text-[var(--color-text-strong)]">
                                                {product.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                                        {product.categories?.name ?? "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span dir="ltr" className="inline-block">
                                            {formatPrice(product.base_price)}
                                        </span>
                                        {getDiscountStatus(product) !== "none" && (
                                            <span
                                                className={`ms-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                                    getDiscountStatus(product) ===
                                                    "active"
                                                        ? "bg-[var(--color-rose-50)] text-[var(--color-rose-600)]"
                                                        : "bg-[var(--color-slate-100)] text-[var(--color-muted)]"
                                                }`}
                                            >
                                                خصم {describeDiscount(product)} (
                                                {
                                                    DISCOUNT_STATUS_LABELS[
                                                        getDiscountStatus(product)
                                                    ]
                                                }
                                                )
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.variantsCount === 0 ? (
                                            <Link
                                                to={`/admin/products/${product.id}/variants`}
                                                className="text-[var(--color-warning-dark)] underline"
                                            >
                                                ضيف ألوان ومقاسات
                                            </Link>
                                        ) : (
                                            <span
                                                className={
                                                    product.totalStock === 0
                                                        ? "font-semibold text-[var(--color-rose-700)]"
                                                        : "text-[var(--color-text-secondary)]"
                                                }
                                            >
                                                {product.totalStock === 0
                                                    ? "نفد المخزون"
                                                    : `${product.totalStock} قطعة`}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={product.is_published}
                                            aria-label={`نشر ${product.name}`}
                                            disabled={togglingId === product.id}
                                            onClick={() =>
                                                handleTogglePublished(product)
                                            }
                                            className={[
                                                "relative h-6 w-11 rounded-full transition-colors disabled:opacity-60",
                                                product.is_published
                                                    ? "bg-[var(--color-success)]"
                                                    : "bg-[var(--color-slate-300)]",
                                            ].join(" ")}
                                        >
                                            <span
                                                className={[
                                                    "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-surface)] shadow transition-all",
                                                    product.is_published
                                                        ? "end-0.5"
                                                        : "start-0.5",
                                                ].join(" ")}
                                            />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-end">
                                        <div className="flex justify-end gap-4 whitespace-nowrap font-semibold">
                                            <Link
                                                to={`/admin/products/${product.id}/variants`}
                                                className="text-[var(--color-primary)] hover:underline"
                                            >
                                                الألوان والمقاسات والصور
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setEditing(product)}
                                                className="text-[var(--color-primary)] hover:underline"
                                            >
                                                تعديل
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
