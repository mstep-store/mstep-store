// Old slugs that may still exist in the database or in old links.
const ALIASES = {
    men: "boys",
    boy: "boys",
    women: "girls",
    girl: "girls",
    baby: "babycollection",
    collection: "babycollection",
    "baby-collection": "babycollection",
    baby_collection: "babycollection",
};

export function normalizeCategorySlug(value) {
    const slug = String(value ?? "").trim().toLowerCase();

    return ALIASES[slug] ?? slug;
}

// "Baby Collection" -> "babycollection". Non-English names return "",
// so the admin has to type the slug by hand in that case.
export function makeCategorySlug(name) {
    return String(name ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "");
}
