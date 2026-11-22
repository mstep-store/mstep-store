
import { useEffect, useState } from "react";
import { getPublishedProducts } from "../services/productService";

export default function useProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getPublishedProducts();

                if (active) {
                    setProducts(data);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message || "حدث خطأ أثناء تحميل المنتجات"
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    return { products, loading, error };
}
