import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Power, Truck, X } from "lucide-react";
import {
    getShippingLocations,
    getShippingSettings,
    saveShippingSettings,
    saveGovernorate,
    saveShippingCity,
    setGovernorateActive,
    setShippingCityActive,
} from "../../services/shippingService";

const inputClass = "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]";

function GovernorateEditor({ value, onClose, onSaved }) {
    const [name, setName] = useState(value?.name ?? "");
    const [price, setPrice] = useState(value?.shipping_price ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function submit(e) {
        e.preventDefault(); setSaving(true); setError("");
        try {
            await saveGovernorate({ id: value?.id, name, shipping_price: price, is_active: value?.is_active ?? true });
            await onSaved();
        } catch (err) { setError(err.message); setSaving(false); }
    }

    return <form onSubmit={submit} className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">{value ? "تعديل المحافظة" : "إضافة محافظة"}</h3><button type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">اسم المحافظة<input className={`${inputClass} mt-2`} required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: الشرقية" /></label>
            <label className="text-sm font-semibold">مصاريف الشحن (جنيه)<input className={`${inputClass} mt-2`} required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 65" /></label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "جاري الحفظ..." : "حفظ"}</button><button type="button" onClick={onClose} className="rounded-xl border px-5 py-2.5 text-sm">إلغاء</button></div>
    </form>;
}

function CityEditor({ governorate, value, onClose, onSaved }) {
    const [name, setName] = useState(value?.name ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function submit(e) {
        e.preventDefault(); setSaving(true); setError("");
        try { await saveShippingCity({ id: value?.id, governorate_id: governorate.id, name, is_active: value?.is_active ?? true }); await onSaved(); }
        catch (err) { setError(err.message); setSaving(false); }
    }
    return <form onSubmit={submit} className="mt-3 rounded-xl bg-[var(--color-page)] p-3">
        <label className="block text-sm font-semibold">اسم المدينة<input className={`${inputClass} mt-2`} autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="اسم المدينة" /></label>
        {error && <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="mt-3 flex gap-2"><button disabled={saving} className="rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm font-bold text-white">{saving ? "حفظ..." : "حفظ المدينة"}</button><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button></div>
    </form>;
}

export default function AdminShipping() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editor, setEditor] = useState(null);
    const [cityEditor, setCityEditor] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [shippingSettings, setShippingSettingsState] = useState({ mode: "governorate", fixed_price: 100 });
    const [settingsSaving, setSettingsSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [rows, settings] = await Promise.all([getShippingLocations({ admin: true }), getShippingSettings()]);
            setLocations(rows);
            setShippingSettingsState(settings);
            setError("");
        }
        catch (err) { setError(err.message || "تعذر تحميل أماكن الشحن."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    async function saveModeSettings() {
        setSettingsSaving(true); setError("");
        try {
            await saveShippingSettings(shippingSettings);
            setError("");
        } catch (err) { setError(err.message); }
        finally { setSettingsSaving(false); }
    }

    async function runToggle(id, action, active) {
        setBusyId(id); setError("");
        try { await action(id, !active); await load(); }
        catch (err) { setError(err.message); }
        finally { setBusyId(null); }
    }

    return <div className="mx-auto max-w-5xl" dir="rtl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div><div className="flex items-center gap-2 text-(--color-primary)"><Truck size={20} /><span className="text-sm font-bold">إعدادات التوصيل</span></div><h1 className="mt-2 text-2xl font-extrabold text-(--color-text-strong)">أماكن الشحن</h1><p className="mt-1 text-sm text-(--color-muted)">أضف المحافظات وحدد سعر الشحن، ثم أضف المدن التابعة لكل محافظة.</p></div>
            <button onClick={() => setEditor({ type: "governorate", value: null })} className="inline-flex items-center gap-2 rounded-xl bg-(--color-navy) px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> إضافة محافظة</button>
        </header>
        <section className="mb-5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-5">
            <h2 className="font-extrabold">طريقة حساب مصاريف الشحن</h2>
            <p className="mt-1 text-sm text-(--color-muted)">اختار طريقة التوصيل اللي هتظهر للعميل في صفحة إتمام الطلب.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className={`rounded-xl border p-4 ${shippingSettings.mode === "fixed" ? "border-(--color-primary) bg-[var(--color-blue-50)]" : "border-(--color-border)"}`}>
                    <input type="radio" name="shipping_mode" className="ml-2" checked={shippingSettings.mode === "fixed"} onChange={() => setShippingSettingsState(v => ({ ...v, mode: "fixed" }))} />
                    <strong>سعر ثابت لأي مكان</strong>
                    <p className="mt-1 text-sm text-(--color-muted)">العميل يكتب المحافظة والمدينة بنفسه.</p>
                    <label className="mt-3 block text-sm font-semibold">سعر الشحن (جنيه)
                        <input type="number" min="0" step="1" value={shippingSettings.fixed_price} onChange={e => setShippingSettingsState(v => ({ ...v, fixed_price: e.target.value }))} className={inputClass + " mt-1" + " outline-none!"} />
                    </label>
                </div>
                <label className={`cursor-pointer rounded-xl border p-4 ${shippingSettings.mode === "governorate" ? "border-(--color-primary) bg-[var(--color-blue-50)]" : "border-(--color-border)"}`}>
                    <input type="radio" name="shipping_mode" className="ml-2" checked={shippingSettings.mode === "governorate"} onChange={() => setShippingSettingsState(v => ({ ...v, mode: "governorate" }))} />
                    <strong>حسب المحافظة</strong>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">العميل يختار المحافظة والمدينة، والسعر يتحدد تلقائيًا.</p>
                </label>
            </div>
            <button type="button" onClick={saveModeSettings} disabled={settingsSaving} className="mt-4 rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{settingsSaving ? "جاري الحفظ..." : "حفظ إعدادات الشحن"}</button>
        </section>
        <div className="mb-5 rounded-xl border border-[var(--color-blue-100)] bg-[var(--color-blue-50)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">أسعار المحافظات والمدن تظل محفوظة ويمكنك الرجوع لنظام التسعير حسب المحافظة في أي وقت.</div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-dark)">{error}</p>}
        {editor?.type === "governorate" && <GovernorateEditor value={editor.value} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); await load(); }} />}
        {loading ? <div className="py-16 text-center text-(--color-muted)">جاري تحميل أماكن الشحن...</div> : locations.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center"><MapPin size={34} className="mx-auto text-(--color-subtle)" /><h2 className="mt-3 font-bold">لسه مفيش محافظات</h2><p className="mt-1 text-sm text-[var(--color-muted)]">ابدأ بإضافة أول محافظة وسعر الشحن الخاص بيها.</p></div> : <div className="mt-5 space-y-4">
            {locations.map(g => <section key={g.id} className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold">{g.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${g.is_active ? "bg-(--color-success-bg) text-(--color-success)" : "bg-(--color-page) text-(--color-muted)"}`}>{g.is_active ? "مفعلة" : "متوقفة"}</span></div><p className="mt-1 text-sm text-(--color-muted)">مصاريف الشحن: <strong className="text-[var(--color-text-strong)]">{Number(g.shipping_price).toLocaleString("en-US")} جنيه</strong> · {(g.shipping_cities ?? []).length} مدينة</p></div>
                    <div className="flex flex-wrap gap-2"><button onClick={() => setEditor({ type: "governorate", value: g })} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold"><Pencil size={15} /> تعديل</button><button disabled={busyId === g.id} onClick={() => runToggle(g.id, setGovernorateActive, g.is_active)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"><Power size={15} />{g.is_active ? "إيقاف" : "تفعيل"}</button><button onClick={() => setCityEditor({ governorate: g, value: null })} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-navy)] px-3 py-2 text-sm font-bold text-white"><Plus size={15} /> إضافة مدينة</button></div>
                </div>
                {cityEditor?.governorate.id === g.id && <CityEditor governorate={g} value={cityEditor.value} onClose={() => setCityEditor(null)} onSaved={async () => { setCityEditor(null); await load(); }} />}
                <div className="mt-4 border-t border-(--color-border) pt-3">{(g.shipping_cities ?? []).length ? <div className="flex flex-wrap gap-2">{g.shipping_cities.map(city => <span key={city.id} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${city.is_active ? "" : "opacity-50"}`}><span>{city.name}{!city.is_active && " (متوقفة)"}</span><button title={city.is_active ? "إيقاف المدينة" : "تفعيل المدينة"} disabled={busyId === `city-${city.id}`} onClick={() => runToggle(`city-${city.id}`, (id, active) => setShippingCityActive(city.id, active), city.is_active)}><Power size={14} /></button><button title="تعديل المدينة" onClick={() => setCityEditor({ governorate: g, value: city })}><Pencil size={14} /></button></span>)}</div> : <p className="text-sm text-[var(--color-muted)]">لم تتم إضافة مدن لهذه المحافظة بعد.</p>}</div>
            </section>)}
        </div>}
    </div>;
}
