import {
    Heart,
    ShoppingBag,
    BadgeCheck,
    RefreshCw,
} from "lucide-react";

const benefits = [
    {
        icon: Heart,
        title: "Made with Love",
        description: "Comfortable styles for your little ones.",
    },
    {
        icon: ShoppingBag,
        title: "Easy Shopping",
        description: "A simple and smooth shopping experience.",
    },
    {
        icon: BadgeCheck,
        title: "Quality First",
        description: "Carefully selected styles for everyday wear.",
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
            <div className="rounded-2xl bg-slate-50 px-5 py-10 sm:px-8 lg:py-12">
                <div className="mb-8 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 sm:text-sm">
                        The Kids & Co. Difference
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                        Shopping Made Special
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
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm transition duration-300 hover:-translate-y-1 hover:text-pink-500">
                                    <Icon size={26} strokeWidth={1.8} />
                                </div>

                                <h3 className="mt-4 font-extrabold text-slate-900">
                                    {benefit.title}
                                </h3>

                                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
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