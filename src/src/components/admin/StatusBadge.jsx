import { getStatusMeta } from "../../utils/orderStatus";

export default function StatusBadge({ status }) {
    const meta = getStatusMeta(status);

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}
        >
            {meta.label}
        </span>
    );
}
