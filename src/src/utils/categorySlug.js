// Old slugs that may still exist in the database or in old links.
const ALIASES = {
    shoe: "shoes",
    sneakers: "shoes",
    sneaker: "shoes",
    boot: "boots",
    slipper: "slippers",
    sandals: "slippers",
};

export function normalizeCategorySlug(value) {
    const slug = String(value ?? "").trim().toLowerCase();

    return ALIASES[slug] ?? slug;
}

// "Running Shoes" -> "runningshoes". Non-English names return "",
// so the admin has to type the slug by hand in that case.
export function makeCategorySlug(name) {
    return String(name ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "");
}
