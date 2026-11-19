import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
    getActiveBanners,
    safeBannerLink,
} from "../../../services/bannerService";

function BannerImage({ banner }) {
    return (
        <img
            src={banner.image_url}
            alt={banner.alt_text || "Promotional banner"}
            loading="lazy"
            className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
        />
    );
}

function BannerItem({ banner }) {
    const link = safeBannerLink(banner.link_url);
    const className =
        "group relative block aspect-2/1 overflow-hidden rounded-2xl bg-[var(--color-page)]";

    if (!link) {
        return (
            <div className={className}>
                <BannerImage banner={banner} />
            </div>
        );
    }

    // Internal paths use the router, full URLs open in a new tab.
    if (link.startsWith("/")) {
        return (
            <Link to={link} className={className}>
                <BannerImage banner={banner} />
            </Link>
        );
    }

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
        >
            <BannerImage banner={banner} />
        </a>
    );
}

// Two banners side by side, managed from the dashboard (Banners page).
export default function PromoBanners() {
    const [banners, setBanners] = useState([]);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getActiveBanners();

                if (active) setBanners(data);
            } catch (err) {
                // The home page works fine without banners.
                console.error(err);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    if (banners.length === 0) return null;

    return (
        <section
            aria-label="Promotions"
            className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:mt-14"
        >
            <div
                className={`grid gap-4 sm:gap-6 ${
                    banners.length > 1 ? "md:grid-cols-2" : ""
                }`}
            >
                {banners.map((banner) => (
                    <BannerItem key={banner.id} banner={banner} />
                ))}
            </div>
        </section>
    );
}
