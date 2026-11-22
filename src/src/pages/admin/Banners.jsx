import { useCallback, useEffect, useState } from "react";
import {
    createBanner,
    deleteBanner,
    getAdminBanners,
    reorderBanners,
    setBannerActive,
    updateBannerDetails,
} from "../../services/bannerService";
import {
    MAX_IMAGE_SIZE_MB,
    validateImageFile,
} from "../../services/adminProductService";

const inputClass =
    "w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm";

const errorClass =
    "rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]";

function BannerForm({ onCancel, onSaved }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [link, setLink] = useState("");
    const [alt, setAlt] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview]
    );

    function handleFile(event) {
        const picked = event.target.files?.[0];

        setError("");

        if (!picked) {
            setFile(null);
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

        setFile(picked);
        setPreview(URL.createObjectURL(picked));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSaving(true);

        try {
            await createBanner({ file, link_url: link, alt_text: alt });
            await onSaved();
        } catch (err) {
            setError(err.message || "تعذر إضافة البانر.");
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
        >
            <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                بانر جديد
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label
                        htmlFor="banner-file"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        صورة البانر
                    </label>
                    <input
                        id="banner-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={handleFile}
                        className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                        المقاس المناسب 1200×600 بيكسل (نسبة 2:1). JPG أو PNG أو
                        WebP، لحد {MAX_IMAGE_SIZE_MB} ميجا.
                    </p>

                    {preview && (
                        <img
                            src={preview}
                            alt="معاينة البانر"
                            className="mt-3 aspect-2/1 w-full max-w-md rounded-xl border border-[var(--color-border)] object-cover"
                        />
                    )}
                </div>

                <div>
                    <label
                        htmlFor="banner-link"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        الرابط (اختياري)
                    </label>
                    <input
                        id="banner-link"
                        dir="ltr"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="/products?brand=nike"
                        className={`${inputClass} text-start`}
                    />
                    <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                        الصفحة اللي بتفتح لما العميل يضغط على البانر. سيبه فاضي
                        لو البانر للعرض بس.
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="banner-alt"
                        className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                        وصف الصورة (اختياري)
                    </label>
                    <input
                        id="banner-alt"
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                        maxLength={150}
                        placeholder="خصم 30% على كوتشيات نايك"
                        className={inputClass}
                    />
                </div>
            </div>

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
                    {saving ? "جاري الرفع..." : "إضافة البانر"}
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

function BannerCard({
    banner,
    isShown,
    isFirst,
    isLast,
    busy,
    onToggle,
    onMove,
    onDelete,
    onSaveDetails,
}) {
    const [link, setLink] = useState(banner.link_url ?? "");
    const [alt, setAlt] = useState(banner.alt_text ?? "");

    const changed =
        link.trim() !== (banner.link_url ?? "") ||
        alt.trim() !== (banner.alt_text ?? "");

    const smallButton =
        "rounded-lg border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-page)] disabled:cursor-not-allowed disabled:opacity-40";

    return (
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
                <img
                    src={banner.image_url}
                    alt={banner.alt_text || "بانر"}
                    className={`aspect-2/1 w-full rounded-lg border border-[var(--color-border)] object-cover sm:w-64 ${
                        banner.is_active ? "" : "opacity-50"
                    }`}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        {banner.is_active ? (
                            isShown ? (
                                <span className="rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 text-[var(--color-success)]">
                                    ظاهر في الرئيسية
                                </span>
                            ) : (
                                <span className="rounded-full bg-[var(--color-warning-bg)] px-2.5 py-1 text-[var(--color-warning-text)]">
                                    شغّال بس مش ظاهر (الرئيسية بتعرض أول بانرين)
                                </span>
                            )
                        ) : (
                            <span className="rounded-full bg-[var(--color-slate-100)] px-2.5 py-1 text-[var(--color-text-muted)]">
                                مخفي
                            </span>
                        )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                            dir="ltr"
                            aria-label="رابط البانر"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="الرابط (اختياري)"
                            className={`${inputClass} text-start`}
                        />
                        <input
                            aria-label="وصف الصورة"
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            maxLength={150}
                            placeholder="وصف الصورة (اختياري)"
                            className={inputClass}
                        />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {changed && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                    onSaveDetails(banner, { link, alt })
                                }
                                className="rounded-lg bg-[var(--color-navy)] px-3 py-1.5 text-xs font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
                            >
                                حفظ التعديل
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onToggle(banner)}
                            className={smallButton}
                        >
                            {banner.is_active ? "إخفاء" : "إظهار"}
                        </button>
                        <button
                            type="button"
                            disabled={busy || isFirst}
                            onClick={() => onMove(banner, -1)}
                            className={smallButton}
                        >
                            ↑ قدّم
                        </button>
                        <button
                            type="button"
                            disabled={busy || isLast}
                            onClick={() => onMove(banner, 1)}
                            className={smallButton}
                        >
                            ↓ أخّر
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDelete(banner)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--color-rose-600)] hover:underline disabled:opacity-40"
                        >
                            حذف
                        </button>
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function AdminBanners() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [adding, setAdding] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [actionError, setActionError] = useState("");

    const load = useCallback(async () => {
        try {
            setBanners(await getAdminBanners());
            setError("");
        } catch (err) {
            setError(err.message || "تعذر تحميل البانرات.");
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
        setAdding(false);
    }

    async function run(banner, action) {
        setBusyId(banner.id);
        setActionError("");

        try {
            await action();
            await load();
        } catch (err) {
            setActionError(err.message || "تعذر تنفيذ العملية.");
        } finally {
            setBusyId(null);
        }
    }

    function handleToggle(banner) {
        return run(banner, () => setBannerActive(banner.id, !banner.is_active));
    }

    function handleMove(banner, direction) {
        const ids = banners.map((item) => item.id);
        const from = ids.indexOf(banner.id);
        const to = from + direction;

        if (to < 0 || to >= ids.length) return;

        [ids[from], ids[to]] = [ids[to], ids[from]];

        return run(banner, () => reorderBanners(ids));
    }

    function handleDelete(banner) {
        if (!window.confirm("حذف البانر ده نهائياً؟")) return;

        return run(banner, () => deleteBanner(banner));
    }

    function handleSaveDetails(banner, { link, alt }) {
        return run(banner, () =>
            updateBannerDetails(banner.id, { link_url: link, alt_text: alt })
        );
    }

    const shownIds = banners
        .filter((banner) => banner.is_active)
        .slice(0, 2)
        .map((banner) => banner.id);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">
                        البانرات
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        الصورتين اللي بيظهروا جنب بعض في الصفحة الرئيسية. الترتيب
                        من فوق لتحت هو الترتيب من الشمال لليمين.
                    </p>
                </div>

                {!adding && (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-navy-hover)]"
                    >
                        إضافة بانر
                    </button>
                )}
            </div>

            {adding && (
                <BannerForm
                    onCancel={() => setAdding(false)}
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

            {!loading && !error && banners.length === 0 && (
                <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
                    لسه مفيش بانرات. اضغط «إضافة بانر» وارفع أول صورة.
                </p>
            )}

            {banners.length > 0 && (
                <ul className="mt-6 space-y-4">
                    {banners.map((banner, index) => (
                        <BannerCard
                            key={`${banner.id}-${banner.link_url}-${banner.alt_text}`}
                            banner={banner}
                            isShown={shownIds.includes(banner.id)}
                            isFirst={index === 0}
                            isLast={index === banners.length - 1}
                            busy={busyId === banner.id}
                            onToggle={handleToggle}
                            onMove={handleMove}
                            onDelete={handleDelete}
                            onSaveDetails={handleSaveDetails}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
