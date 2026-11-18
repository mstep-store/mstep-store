import { useState } from "react";
import { Link } from "react-router";
import { Clock, Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { sendContactMessage } from "../../services/contactService";
import { validateContactForm } from "../../utils/validators";
import { storeInfo } from "../../config/store";

const initialForm = { name: "", email: "", phone: "", message: "" };

const info = [
    { icon: Mail, title: "Email", text: storeInfo.email },
    { icon: Phone, title: "Phone", text: storeInfo.phone },
    { icon: MapPin, title: "Location", text: storeInfo.location },
    { icon: Clock, title: "Working hours", text: storeInfo.hours },
];

const inputClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-subtle)] focus:border-[var(--color-primary-hover)] focus:ring-4 focus:ring-[var(--color-blue-100)]";

function Field({ id, label, error, children }) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-bold text-[var(--color-text-secondary)]"
            >
                {label}
            </label>
            {children}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-xs text-[var(--color-danger)]">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function Contact() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [submitError, setSubmitError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitError("");

        const validation = validateContactForm(form);
        setErrors(validation);

        if (Object.keys(validation).length > 0) return;

        setSending(true);

        try {
            await sendContactMessage(form);
            setForm(initialForm);
            setSent(true);
        } catch (err) {
            console.error("Error sending message:", err);
            setSubmitError(
                "We couldn't send your message. Please try again in a moment."
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="bg-(--color-surface) pb-8">
            <section className="bg-(--color-page)">
                <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:py-16">
                    <h1 className="text-3xl font-extrabold tracking-tight text-(--color-text-strong) sm:text-4xl">
                        Get in touch
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-(--color-muted) sm:text-base">
                        Questions about an order, shoe sizes, or a product? Send us a
                        message and we&apos;ll get back to you as soon as we can.
                    </p>
                </div>
            </section>

            <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-4 sm:px-6 lg:mt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
                {/* Contact info */}
                <aside>
                    <ul className="space-y-5">
                        {info.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex items-start gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-blue-50)] text-[var(--color-primary)]">
                                    <Icon size={22} strokeWidth={1.8} />
                                </span>
                                <div>
                                    <h2 className="text-sm font-extrabold text-[var(--color-text-strong)]">
                                        {title}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                                        {text}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-8 rounded-2xl bg-[var(--color-pink-50)] px-5 py-4 text-sm leading-6 text-[var(--color-pink-darker)]">
                        Not sure about your size or style? Browse the{" "}
                        <Link to="/products" className="font-bold underline">
                            full collection
                        </Link>{" "}
                        first, you might find your answer on the product page.
                    </p>
                </aside>

                {/* Form */}
                <div className="rounded-2xl border border-[var(--color-border-soft)] p-5 shadow-sm sm:p-8">
                    {sent ? (
                        <div
                            role="status"
                            className="flex flex-col items-center py-10 text-center"
                        >
                            <CheckCircle2
                                size={52}
                                strokeWidth={1.6}
                                className="text-(--color-success)"
                            />
                            <h2 className="mt-4 text-xl font-extrabold text-(--color-text-strong)">
                                Message sent
                            </h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-(--color-muted)">
                                Thanks for reaching out. We&apos;ll reply to the email you provided
                                as soon as possible.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSent(false)}
                                className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)]"
                            >
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field id="name" label="Name" error={errors.name}>
                                    <input
                                        id="name"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        aria-invalid={Boolean(errors.name)}
                                        aria-describedby={errors.name ? "name-error" : undefined}
                                        maxLength={120}
                                        placeholder="Your name"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field id="email" label="Email" error={errors.email}>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        maxLength={200}
                                        placeholder="you@example.com"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field id="phone" label="Phone (optional)" error={errors.phone}>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    autoComplete="tel"
                                    aria-invalid={Boolean(errors.phone)}
                                    aria-describedby={errors.phone ? "phone-error" : undefined}
                                    maxLength={30}
                                    placeholder="01xxxxxxxxx"
                                    className={inputClass}
                                />
                            </Field>

                            <Field id="message" label="Message" error={errors.message}>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={6}
                                    value={form.message}
                                    onChange={handleChange}
                                    aria-invalid={Boolean(errors.message)}
                                    aria-describedby={errors.message ? "message-error" : undefined}
                                    maxLength={3000}
                                    placeholder="How can we help?"
                                    className={`${inputClass} resize-y`}
                                />
                            </Field>

                            {submitError && (
                                <p
                                    role="alert"
                                    className="rounded-xl bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]"
                                >
                                    {submitError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full rounded-full bg-(--color-primary) px-6 py-3.5 text-sm font-bold text-(--color-on-primary) transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                                {sending ? "Sending..." : "Send message"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
