export default function PriceTag({ info, className = "mt-3" }) {
    return (
        <p
            className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-extrabold text-slate-900 sm:text-base ${className}`}
        >
            <span>{info.effective.toFixed(2)} EGP</span>

            {info.discounted && (
                <>
                    <span className="text-xs font-medium text-slate-400 line-through">
                        {info.original.toFixed(2)} EGP
                    </span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 sm:text-xs">
                        -{info.percentOff}%
                    </span>
                </>
            )}
        </p>
    );
}
