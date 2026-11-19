import { useCallback, useEffect, useState } from "react";
import {
    createBrand,
    deleteBrand,
    getAdminBrands,
    updateBrand,
} from "../../services/brandService";
import {
    MAX_IMAGE_SIZE_MB,
    validateImageFile,
} from "../../services/adminProductService";
import { makeCategorySlug } from "../../utils/categorySlug";

const inputClass =
    "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm";

const errorClass =
    "rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]";

function BrandLogo({ brand, size = "h-10 w-10" }) {
    if (brand.logo_url) {
        return (
            <img
                src={brand.logo_url}
                alt=""
                className={`${size} rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] object-contain`}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={`${size} flex items-center justify-center rounded-lg bg-[var(--color-slate-100)] text-sm font-bold text-[var(--color-text-muted)]`}
        >
            {brand.name.slice(0, 1).toUpperCase()}
        </span>
    );
}

function BrandForm({ brand, onCancel, onSaved }) {
    const isEditing = Boolean(brand);

    const [name, setName] = useState(brand?.name ?? "");
    const [slug, setSlug] = useState(brand?.slug ?? "");
    // For a new brand the slug follows the name until it is edited by hand.
    const [slugTouched, setSlugTouched] = useState(isEditing);
    const [isActive, setIsActive] = useState(brand?.is_active ?? true);
    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [removeLogo, setRemoveLogo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview]
    );

    function handleNameChange(value) {
        setName(value);

        if (!slugTouched) {
            setSlug(makeCategorySlug(value));
        }
    }

    function handleLogo(event) {
        const picked = event.target.files?.[0];

        setError("");

        if (!picked) {
            setLogoFile(null);
            setPreview("");
            return;
        }

        try {
            validateImageFile(picked);
        } catch (err) {
            setError(err.message);
            event.target.value = "";
            return;
        }

        setLogoFile(picked);
        setPreview(URL.createObjectURL(picked));
        setRemoveLogo(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSaving(true);

        const fields = { name, slug, is_active: isActive, logoFile };

        try {
            if (isEditing) {
                await updateBrand(brand, { ...fields, removeLogo });
            } else {
                await createBrand(fields);
            }

            await onSaved();
        } catch (err) {
            setError(err.message || "تعذر حفظ البراند.");
            setSaving(false);
        }
    }

    const currentLogo =
        preview || (!removeLogo && brand?.logo_url ? brand.logo_url : "");

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
        >
            <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                {isEditing ? `تعديل: ${brand.name}` : "براند جديد"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="brand-name"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        اسم البراند
                    </label>
                    <input
                        id="brand-name"
                        required
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Nike"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label
                        htmlFor="brand-slug"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        الـ slug (جزء من رابط المتجر)
                    </label>
                    <input
                        id="brand-slug"
                        required
                        dir="ltr"
                        value={slug}
                        onChange={(e) => {
                            setSlugTouched(true);
                            setSlug(e.target.value.toLowerCase());
                        }}
                        placeholder="nike"
                        className={`${inputClass} text-start`}
                    />
                    <p
                        dir="ltr"
                        className="mt-1.5 text-start text-xs text-[var(--color-subtle)]"
                    >
                        /products?brand={slug || "…"}
                    </p>
                </div>

                <div className="sm:col-span-2">
                    <label
                        htmlFor="brand-logo"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        اللوجو (اختياري)
                    </label>

                    <div className="flex flex-wrap items-center gap-4">
                        {currentLogo && (
                            <img
                                src={currentLogo}
                                alt="معاينة اللوجو"
                                className="h-20 w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] object-contain p-2"
                            />
                        )}

                        <div className="min-w-0 flex-1">
                            <input
                                id="brand-logo"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleLogo}
                                className={inputClass}
                            />
                            <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                                الأفضل PNG بخلفية شفافة. JPG أو PNG أو WebP، لحد{" "}
                                {MAX_IMAGE_SIZE_MB} ميجا.
                            </p>
                        </div>
                    </div>

                    {isEditing && brand.logo_url && !preview && (
                        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <input
                                type="checkbox"
                                checked={removeLogo}
                                onChange={(e) => setRemoveLogo(e.target.checked)}
                                className="h-4 w-4"
                            />
                            حذف اللوجو الحالي
                        </label>
                    )}
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4"
                    />
                    البراند ظاهر في المتجر
                </label>
            </div>

            {isEditing && slug !== brand.slug && (
                <p className="mt-4 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]">
                    تغيير الـ slug هيغيّر رابط البراند، فأي رابط قديم عليه (زي
                    رابط بانر) محتاج يتحدّث.
                </p>
            )}

            {error && (
                <p role="alert" className={`mt-4 ${errorClass}`}>
                    {error}
                </p>
            )}

            <div className="mt-5 flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--color-navy)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
                >
                    {saving ? "جاري الحفظ..." : "حفظ البراند"}
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

export default function AdminBrands() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // null = closed, "new" = creating, brand object = editing
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [actionError, setActionError] = useState("");

    const load = useCallback(async () => {
        try {
            setBrands(await getAdminBrands());
            setError("");
        } catch (err) {
            setError(err.message || "تعذر تحميل البراندات.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function handleSaved() {
        await load();
        setEditing(null);
    }

    async function handleDelete(brand) {
        const warning =
            brand.productsCount > 0
                ? `حذف البراند «${brand.name}»؟ الـ ${brand.productsCount} منتج اللي عليه هيفضلوا موجودين بس من غير براند.`
                : `حذف البراند «${brand.name}»؟`;

        if (!window.confirm(warning)) return;

        setDeletingId(brand.id);
        setActionError("");

        try {
            await deleteBrand(brand);
            setBrands((current) =>
                current.filter((item) => item.id !== brand.id)
            );
        } catch (err) {
            setActionError(err.message || "تعذر حذف البراند.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">
                        البراندات
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        البراندات اللي بتظهر في الصفحة الرئيسية. البراند بيظهر
                        للعملاء لما يبقى عليه منتج منشور واحد على الأقل.
                    </p>
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)]"
                    >
                        إضافة براند
                    </button>
                )}
            </div>

            {editing && (
                <BrandForm
                    key={editing === "new" ? "new" : editing.id}
                    brand={editing === "new" ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            {loading && (
                <p className="mt-8 text-sm text-[var(--color-muted)]">
                    جاري التحميل...
                </p>
            )}

            {error && (
                <p role="alert" className={`mt-6 ${errorClass}`}>
                    {error}
                </p>
            )}

            {actionError && (
                <p role="alert" className={`mt-6 ${errorClass}`}>
                    {actionError}
                </p>
            )}

            {!loading && !error && brands.length === 0 && (
                <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
                    لسه مفيش براندات. اضغط «إضافة براند» وابدأ بأول واحد.
                </p>
            )}

            {brands.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <table className="w-full min-w-lg text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-page)] text-xs text-[var(--color-muted)]">
                                <th className="px-4 py-3 text-start font-semibold">
                                    البراند
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    الـ slug
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    المنتجات
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    الحالة
                                </th>
                                <th className="px-4 py-3">
                                    <span className="sr-only">إجراءات</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map((brand) => (
                                <tr
                                    key={brand.id}
                                    className="border-b border-[var(--color-border-soft)] last:border-0"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <BrandLogo brand={brand} />
                                            <span className="font-semibold text-[var(--color-text-strong)]">
                                                {brand.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                                        <span dir="ltr" className="inline-block">
                                            {brand.slug}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                        {brand.productsCount}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-semibold">
                                        {!brand.is_active ? (
                                            <span className="text-[var(--color-text-muted)]">
                                                مخفي
                                            </span>
                                        ) : brand.productsCount === 0 ? (
                                            <span className="text-[var(--color-warning-text)]">
                                                مش ظاهر (مفيش منتجات)
                                            </span>
                                        ) : (
                                            <span className="text-[var(--color-success)]">
                                                ظاهر
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-end">
                                        <div className="flex justify-end gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setEditing(brand)}
                                                className="font-semibold text-[var(--color-primary)] hover:underline"
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(brand)}
                                                disabled={deletingId === brand.id}
                                                className="font-semibold text-[var(--color-rose-600)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-slate-300)] disabled:no-underline"
                                            >
                                                حذف
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
