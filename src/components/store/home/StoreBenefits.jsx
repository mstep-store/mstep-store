import {
    Heart,
    ShoppingBag,
    BadgeCheck,
    RefreshCw,
} from "lucide-react";

const benefits = [
    {
        icon: Heart,
        title: "Made for Comfort",
        description: "Cushioned, lightweight pairs you can wear all day.",
    },
    {
        icon: ShoppingBag,
        title: "Easy Shopping",
        description: "A simple and smooth shopping experience.",
    },
    {
        icon: BadgeCheck,
        title: "Quality First",
        description: "Carefully selected styles built to last.",
    },
    {
        icon: RefreshCw,
        title: "Easy Returns",
        description: "Shop with confidence and peace of mind.",
    },
];

export default function StoreBenefits() {
    return (
        <section
            id="store-benefits"
            className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20"
        >
            <div className="rounded-2xl bg-[var(--color-page)] px-5 py-10 sm:px-8 lg:py-12">
                <div className="mb-8 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] sm:text-sm">
                        The M.STEP Difference
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                        Shopping Made Easy
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {benefits.map((benefit) => {
                        const Icon = benefit.icon;

                        return (
                            <div
                                key={benefit.title}
                                className="text-center"
                            >
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm transition duration-300 hover:-translate-y-1 hover:text-[var(--color-pink)]">
                                    <Icon size={26} strokeWidth={1.8} />
                                </div>

                                <h3 className="mt-4 font-extrabold text-[var(--color-text-strong)]">
                                    {benefit.title}
                                </h3>

                                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--color-muted)]">
                                    {benefit.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}