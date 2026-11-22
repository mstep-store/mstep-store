import { useCallback, useEffect, useState } from "react";
import {
    deleteContactMessage,
    getContactMessages,
    setMessageRead,
} from "../../services/contactService";

function formatDate(value) {
    return new Date(value).toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");

    const load = useCallback(async () => {
        try {
            setError("");
            setMessages(await getContactMessages());
        } catch (err) {
            setError(err.message || "تعذر تحميل الرسائل.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function toggleRead(message) {
        try {
            await setMessageRead(message.id, !message.is_read);
            await load();
        } catch (err) {
            setError(err.message || "تعذر تحديث الرسالة.");
        }
    }

    async function remove(message) {
        if (!window.confirm(`حذف رسالة ${message.name}؟`)) return;

        try {
            await deleteContactMessage(message.id);
            await load();
        } catch (err) {
            setError(err.message || "تعذر حذف الرسالة.");
        }
    }

    const unread = messages.filter((m) => !m.is_read).length;
    const visible =
        filter === "unread" ? messages.filter((m) => !m.is_read) : messages;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">
                        الرسائل
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {messages.length} رسالة — {unread} غير مقروءة
                    </p>
                </div>

                <div className="flex gap-1 rounded-lg bg-[var(--color-slate-200-60)] p-1">
                    {[
                        ["all", "الكل"],
                        ["unread", "غير المقروءة"],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                                filter === value
                                    ? "bg-[var(--color-surface)] text-[var(--color-text-strong)] shadow-sm"
                                    : "text-[var(--color-text-muted)]"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mt-4 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                >
                    {error}
                </p>
            )}

            {loading ? (
                <p className="mt-8 text-sm text-[var(--color-muted)]">جاري التحميل...</p>
            ) : visible.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)]">
                    مفيش رسائل لحد دلوقتي.
                </p>
            ) : (
                <ul className="mt-6 space-y-3">
                    {visible.map((message) => (
                        <li
                            key={message.id}
                            className={`rounded-xl border bg-[var(--color-surface)] p-4 sm:p-5 ${
                                message.is_read
                                    ? "border-[var(--color-border)]"
                                    : "border-[var(--color-blue-300)] shadow-sm shadow-[var(--color-blue-100)]"
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-bold text-[var(--color-text-strong)]">
                                        {message.name}
                                        {!message.is_read && (
                                            <span className="me-2 ms-2 rounded-full bg-[var(--color-blue-100)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary-dark)]">
                                                جديدة
                                            </span>
                                        )}
                                    </p>
                                    <p
                                        dir="ltr"
                                        className="mt-1 text-start text-sm text-[var(--color-muted)]"
                                    >
                                        <a
                                            href={`mailto:${message.email}`}
                                            className="text-[var(--color-primary)] hover:underline"
                                        >
                                            {message.email}
                                        </a>
                                        {message.phone && ` · ${message.phone}`}
                                    </p>
                                </div>

                                <time className="text-xs text-[var(--color-subtle)]">
                                    {formatDate(message.created_at)}
                                </time>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--color-text-secondary)]">
                                {message.message}
                            </p>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleRead(message)}
                                    className="rounded-lg border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]"
                                >
                                    {message.is_read
                                        ? "علّم كغير مقروءة"
                                        : "علّم كمقروءة"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remove(message)}
                                    className="rounded-lg border border-[var(--color-rose-200)] px-3 py-1.5 text-sm font-semibold text-[var(--color-rose-600)] hover:bg-[var(--color-rose-50)]"
                                >
                                    حذف
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
