import { useEffect } from "react";
import { useLocation } from "react-router";

// Start every page change (and category change) from the top.
export default function ScrollToTop() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname, search]);

    return null;
}
