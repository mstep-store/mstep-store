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
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

function Field({ id, label, error, children }) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-bold text-slate-700"
            >
                {label}
            </label>
            {children}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
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
        <div className="bg-white pb-8">
            <section className="bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:py-16">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Get in touch
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                        Questions about an order, sizes, or a product? Send us a
                        message and we'll get back to you as soon as we can.
                    </p>
                </div>
            </section>

            <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-4 sm:px-6 lg:mt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
                {/* Contact info */}
                <aside>
                    <ul className="space-y-5">
                        {info.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex items-start gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Icon size={22} strokeWidth={1.8} />
                                </span>
                                <div>
                                    <h2 className="text-sm font-extrabold text-slate-900">
                                        {title}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        {text}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-8 rounded-2xl bg-pink-50 px-5 py-4 text-sm leading-6 text-pink-700">
                        Looking for something specific? Browse the{" "}
                        <Link to="/products" className="font-bold underline">
                            full collection
                        </Link>{" "}
                        first — you might find your answer on the product page.
                    </p>
                </aside>

                {/* Form */}
                <div className="rounded-2xl border border-slate-100 p-5 shadow-sm sm:p-8">
                    {sent ? (
                        <div
                            role="status"
                            className="flex flex-col items-center py-10 text-center"
                        >
                            <CheckCircle2
                                size={52}
                                strokeWidth={1.6}
                                className="text-green-500"
                            />
                            <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                                Message sent
                            </h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Thanks for reaching out. We'll reply to the
                                email you provided.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSent(false)}
                                className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
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
                                    className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
                                >
                                    {submitError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
