import { useCallback, useEffect, useState } from "react";
import {
    createCategory,
    deleteCategory,
    getAdminCategories,
    updateCategory,
} from "../../services/adminProductService";
import { makeCategorySlug } from "../../utils/categorySlug";

function CategoryForm({ category, onCancel, onSaved }) {
    const isEditing = Boolean(category);

    const [name, setName] = useState(category?.name ?? "");
    const [slug, setSlug] = useState(category?.slug ?? "");
    // For a new category the slug follows the name until it is edited by hand.
    const [slugTouched, setSlugTouched] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function handleNameChange(value) {
        setName(value);

        if (!slugTouched) {
            setSlug(makeCategorySlug(value));
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSaving(true);

        try {
            if (isEditing) {
                await updateCategory(category.id, { name, slug });
            } else {
                await createCategory({ name, slug });
            }

            await onSaved();
        } catch (err) {
            setError(err.message || "تعذر حفظ التصنيف.");
            setSaving(false);
        }
    }

    const inputClass =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
        >
            <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? `تعديل: ${category.name}` : "تصنيف جديد"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="category-name"
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                        اسم التصنيف
                    </label>
                    <input
                        id="category-name"
                        required
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Baby Collection"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label
                        htmlFor="category-slug"
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                        الـ slug (جزء من رابط المتجر)
                    </label>
                    <input
                        id="category-slug"
                        required
                        dir="ltr"
                        value={slug}
                        onChange={(e) => {
                            setSlugTouched(true);
                            setSlug(e.target.value.toLowerCase());
                        }}
                        placeholder="babycollection"
                        className={`${inputClass} text-start`}
                    />
                    <p dir="ltr" className="mt-1.5 text-start text-xs text-slate-400">
                        /products?category={slug || "…"}
                    </p>
                </div>
            </div>

            {isEditing && slug !== category.slug && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    تغيير الـ slug هيغيّر رابط التصنيف، فأي رابط قديم عليه
                    (في الناف بار أو الصفحة الرئيسية) محتاج يتحدّث.
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                    {error}
                </p>
            )}

            <div className="mt-5 flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#172b45] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#223d5f] disabled:opacity-60"
                >
                    {saving ? "جاري الحفظ..." : "حفظ التصنيف"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    إلغاء
                </button>
            </div>
        </form>
    );
}

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // null = closed, "new" = creating, category object = editing
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [actionError, setActionError] = useState("");

    const load = useCallback(async () => {
        try {
            setCategories(await getAdminCategories());
            setError("");
        } catch (err) {
            setError(err.message || "تعذر تحميل التصنيفات.");
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

    async function handleDelete(category) {
        if (!window.confirm(`حذف التصنيف «${category.name}»؟`)) return;

        setDeletingId(category.id);
        setActionError("");

        try {
            await deleteCategory(category.id);
            setCategories((current) =>
                current.filter((item) => item.id !== category.id)
            );
        } catch (err) {
            setActionError(err.message || "تعذر حذف التصنيف.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        التصنيفات
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        التصنيفات اللي بتظهر في المتجر وبتختار منها لكل منتج.
                    </p>
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="rounded-lg bg-[#172b45] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#223d5f]"
                    >
                        إضافة تصنيف
                    </button>
                )}
            </div>

            {editing && (
                <CategoryForm
                    key={editing === "new" ? "new" : editing.id}
                    category={editing === "new" ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            {loading && (
                <p className="mt-8 text-sm text-slate-500">جاري التحميل...</p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                    {error}
                </p>
            )}

            {actionError && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                    {actionError}
                </p>
            )}

            {!loading && !error && categories.length === 0 && (
                <p className="mt-10 text-center text-sm text-slate-500">
                    لسه مفيش تصنيفات. اضغط «إضافة تصنيف» وابدأ بأول واحد.
                </p>
            )}

            {!loading && categories.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-lg text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                                <th className="px-4 py-3 text-start font-semibold">
                                    الاسم
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    الـ slug
                                </th>
                                <th className="px-4 py-3 text-start font-semibold">
                                    المنتجات
                                </th>
                                <th className="px-4 py-3">
                                    <span className="sr-only">إجراءات</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr
                                    key={category.id}
                                    className="border-b border-slate-100 last:border-0"
                                >
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                        {category.name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <span dir="ltr" className="inline-block">
                                            {category.slug}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                        {category.productsCount}
                                    </td>
                                    <td className="px-4 py-3 text-end">
                                        <div className="flex justify-end gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setEditing(category)}
                                                className="font-semibold text-blue-600 hover:underline"
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(category)}
                                                disabled={
                                                    deletingId === category.id ||
                                                    category.productsCount > 0
                                                }
                                                title={
                                                    category.productsCount > 0
                                                        ? "انقل المنتجات لتصنيف تاني الأول"
                                                        : undefined
                                                }
                                                className="font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
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
