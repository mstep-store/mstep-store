







import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
    ArrowRight,
    Check,
    Heart,
    Minus,
    Plus,
    ShoppingBag,
    ShieldCheck,
    Truck,
} from "lucide-react";
import { getProductById } from "../../services/productService";
import {
    getEffectivePrice,
    getOriginalPrice,
    getPriceInfo,
} from "../../utils/pricing";

const CART_KEY = "cart";

function readCart() {
    try {
        const savedCart = localStorage.getItem(CART_KEY);
        const parsedCart = savedCart ? JSON.parse(savedCart) : [];

        return Array.isArray(parsedCart) ? parsedCart : [];
    } catch {
        return [];
    }
}

function ProductDetails() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [cartError, setCartError] = useState("");
    const [favorite, setFavorite] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadProduct() {
            setLoading(true);
            setError("");

            try {
                const data = await getProductById(id);

                if (!active) return;

                setProduct(data);
                setSelectedColor(null);
                setSelectedSize(null);
                setSelectedImage(0);
                setQuantity(1);
                setAddedToCart(false);
                setCartError("");
            } catch (err) {
                console.error("Error loading product:", err);

                if (active) {
                    setError("An error occurred while loading the product. Please try again.");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProduct();

        return () => {
            active = false;
        };
    }, [id]);

    const images = product?.images ?? [];

    const variants = useMemo(
        () =>
            (product?.variants ?? []).filter(
                (variant) =>
                    variant.is_available !== false &&
                    Number(variant.stock_quantity) > 0
            ),
        [product]
    );

    const colors = useMemo(() => {
        const colorIds = new Set(variants.map((variant) => variant.color_id));

        return (product?.product_colors ?? []).filter(
            (color) => colorIds.has(color.id)
        );
    }, [product, variants]);

    const sizes = useMemo(() => {
        const matchingVariants = variants.filter(
            (variant) =>
                selectedColor === null || variant.color_id === selectedColor
        );

        const sizeIds = new Set(
            matchingVariants.map((variant) => variant.size_id)
        );

        return (product?.product_sizes ?? [])
            .filter((size) => sizeIds.has(size.id))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }, [product, variants, selectedColor]);

    const selectedVariant = variants.find(
        (variant) =>
            variant.color_id === selectedColor &&
            variant.size_id === selectedSize
    );

    const availableVariants = variants.filter(
        (variant) =>
            (selectedColor === null || variant.color_id === selectedColor) &&
            (selectedSize === null || variant.size_id === selectedSize)
    );

    const referenceVariant = selectedVariant ?? availableVariants[0] ?? null;

    // Product-level discount applies to every variant's own price.
    const priceInfo = referenceVariant
        ? getPriceInfo(referenceVariant, product)
        : {
            original: Number(product?.base_price) || 0,
            effective: Number(product?.base_price) || 0,
            discounted: false,
            percentOff: 0,
        };

    const price = priceInfo.effective;

    const currentImage = images[selectedImage];

    function chooseColor(colorId) {
        setSelectedColor(colorId);
        setSelectedSize(null);
        setQuantity(1);
        setAddedToCart(false);
        setCartError("");

        const colorImageIndex = images.findIndex(
            (image) => image.color_id === colorId
        );

        if (colorImageIndex >= 0) {
            setSelectedImage(colorImageIndex);
        }
    }

    function showPreviousImage() {
        setSelectedImage((current) =>
            current === 0 ? images.length - 1 : current - 1
        );
    }

    function showNextImage() {
        setSelectedImage((current) =>
            current === images.length - 1 ? 0 : current + 1
        );
    }

    useEffect(() => {
        if (!lightboxOpen) return;

        function handleKeyDown(event) {
            if (event.key === "Escape") setLightboxOpen(false);
            if (event.key === "ArrowLeft") showNextImage();
            if (event.key === "ArrowRight") showPreviousImage();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxOpen, images.length]);

    function changeQuantity(amount) {
        if (!selectedVariant) return;

        const max = Number(selectedVariant.stock_quantity);

        setQuantity((current) =>
            Math.min(max, Math.max(1, current + amount))
        );

        setAddedToCart(false);
    }

    function addToCart() {
        setCartError("");
        setAddedToCart(false);

        if (!selectedVariant) {
            setCartError("Please select a color and size first.");
            return;
        }

        const stock = Number(selectedVariant.stock_quantity);

        if (quantity < 1 || quantity > stock) {
            setCartError(`Only ${stock} item(s) are currently available.`);
            return;
        }

        const color = product.product_colors?.find(
            (item) => item.id === selectedVariant.color_id
        );

        const size = product.product_sizes?.find(
            (item) => item.id === selectedVariant.size_id
        );

        const cartItem = {
            variant_id: selectedVariant.id,
            product_id: product.id,
            name: product.name,
            color_id: selectedVariant.color_id,
            color_name: color?.name ?? "",
            size_id: selectedVariant.size_id,
            size_name: size?.name ?? "",
            price: getEffectivePrice(selectedVariant, product),
            original_price: getOriginalPrice(selectedVariant),
            quantity,
            image_url:
                currentImage?.image_url ??
                images[0]?.image_url ??
                null,
            sku: selectedVariant.sku ?? "",
        };

        try {
            const cart = readCart();

            const existingIndex = cart.findIndex(
                (item) =>
                    String(item.variant_id) === String(cartItem.variant_id)
            );

            if (existingIndex >= 0) {
                const existingQuantity =
                    Number(cart[existingIndex].quantity) || 0;
                const newQuantity = existingQuantity + quantity;

                if (newQuantity > stock) {
                    setCartError(
                        `You already have ${existingQuantity} of this variant in your cart. The total available stock is ${stock}.`
                    );
                    return;
                }

                cart[existingIndex] = {
                    ...cart[existingIndex],
                    ...cartItem,
                    quantity: newQuantity,
                };
            } else {
                cart.push(cartItem);
            }

            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            window.dispatchEvent(new Event("cart-updated"));
            setAddedToCart(true);
        } catch (err) {
            console.error("Error saving cart:", err);
            setCartError(
                "Unable to save the item to your cart. Please check your browser settings."
            );
        }
    }

    if (loading) {
        return (
            <main className="min-h-[60vh] px-4 py-24">
                <div className="mx-auto max-w-6xl animate-pulse">
                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="aspect-4/5 rounded-3xl bg-[var(--color-slate-100)]" />
                        <div className="space-y-5 py-6">
                            <div className="h-4 w-28 rounded bg-[var(--color-slate-100)]" />
                            <div className="h-9 w-3/4 rounded bg-[var(--color-slate-100)]" />
                            <div className="h-7 w-36 rounded bg-[var(--color-slate-100)]" />
                            <div className="h-20 rounded bg-[var(--color-slate-100)]" />
                            <div className="h-12 rounded bg-[var(--color-slate-100)]" />
                            <div className="h-12 rounded bg-[var(--color-slate-100)]" />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-pink-50)] text-[var(--color-pink)]">
                    <ShoppingBag size={34} />
                </div>

                <h1 className="mb-3 text-2xl font-extrabold text-[var(--color-text)]">
                    {error ? "Something Went Wrong" : "Product Not Found"}
                </h1>

                <p className="mb-6 text-[var(--color-muted)]">
                    {error || "This product does not exist or is no longer available."}
                </p>

                <Link
                    to="/products"
                    className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-dark)]"
                >
                    Browse Products
                </Link>
            </main>
        );
    }

    const hasVariants = variants.length > 0;

    return (
        <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                {/* Breadcrumb */}
                <nav className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
                    <Link to="/" className="transition hover:text-[var(--color-primary)]">
                        Home
                    </Link>
                    <span>/</span>
                    <Link
                        to="/products"
                        className="transition hover:text-[var(--color-primary)]"
                    >
                        Products
                    </Link>
                    <span>/</span>
                    <span className="max-w-55 truncate font-semibold text-[var(--color-text)]">
                        {product.name}
                    </span>
                </nav>

                <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
                    {/* Product images */}
                    <section className="min-w-0">
                        <div className="relative overflow-hidden rounded-3xl bg-[var(--color-page)] w-75 md:w-100">
                            {currentImage?.image_url ? (
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="block w-full cursor-zoom-in"
                                    aria-label="Open product images"
                                >
                                    <img
                                        src={currentImage.image_url}
                                        alt={currentImage.alt_text || product.name}
                                        className="aspect-4/5 w-full object-cover"
                                    />
                                </button>
                            ) : (
                                <div className="flex aspect-4/5 items-center justify-center text-[var(--color-subtle)]">
                                    <div className="text-center">
                                        <ShoppingBag
                                            className="mx-auto mb-3"
                                            size={42}
                                        />
                                        <p>No Product Image Available</p>
                                    </div>
                                </div>
                            )}

                            <span className="absolute left-4 top-4 rounded-full bg-[var(--color-white-95)] px-4 py-2 text-xs font-bold text-[var(--color-primary-dark)] shadow-sm">
                                M.STEP
                            </span>

                            <button
                                type="button"
                                onClick={() => setFavorite((value) => !value)}
                                aria-label={
                                    favorite
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                }
                                aria-pressed={favorite}
                                className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface)] shadow-sm transition hover:scale-105 ${favorite ? "text-[var(--color-pink)]" : "text-[var(--color-muted)]"
                                    }`}
                            >
                                <Heart
                                    size={21}
                                    fill={favorite ? "currentColor" : "none"}
                                />
                            </button>
                        </div>

                        {images.length > 1 && (
                            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                {images.map((image, index) => (
                                    <button
                                        key={image.id ?? image.image_url}
                                        type="button"
                                        onClick={() => setSelectedImage(index)}
                                        aria-label={`View image ${index + 1}`}
                                        aria-pressed={selectedImage === index}
                                        className={`shrink-0 overflow-hidden rounded-2xl border-2 transition ${selectedImage === index
                                            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-blue-100)]"
                                            : "border-transparent hover:border-[var(--color-pink-200)]"
                                            }`}
                                    >
                                        <img
                                            src={image.image_url}
                                            alt={
                                                image.alt_text ||
                                                `${product.name} - ${index + 1}`
                                            }
                                            className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Product information */}
                    <section className="py-1 lg:py-4">
                        {(product.brands?.name || product.categories?.name) && (
                            <p className="mb-3 flex flex-wrap items-center gap-x-2 text-sm font-bold text-[var(--color-pink)]">
                                {product.brands?.name && (
                                    <Link
                                        to={`/products?brand=${product.brands.slug}`}
                                        className="hover:underline"
                                    >
                                        {product.brands.name}
                                    </Link>
                                )}
                                {product.brands?.name &&
                                    product.categories?.name && (
                                        <span aria-hidden="true">·</span>
                                    )}
                                {product.categories?.name && (
                                    <span>{product.categories.name}</span>
                                )}
                            </p>
                        )}

                        <h1 className="mb-4 text-3xl font-extrabold leading-tight text-[var(--color-text-strong)] sm:text-4xl">
                            {product.name}
                        </h1>

                        <div className="mb-5 flex flex-wrap items-center gap-3">
                            <p className="text-3xl font-extrabold text-[var(--color-primary-dark)]">
                                {price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{" "}
                                <span className="text-lg">EGP</span>
                            </p>

                            {priceInfo.discounted && (
                                <>
                                    <p className="text-lg font-medium text-[var(--color-subtle)] line-through">
                                        {priceInfo.original.toLocaleString(
                                            "en-US",
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}{" "}
                                        EGP
                                    </p>
                                    <span className="rounded-full bg-[var(--color-rose-50)] px-3 py-1.5 text-sm font-bold text-[var(--color-rose-600)]">
                                        -{priceInfo.percentOff}%
                                    </span>
                                </>
                            )}

                            <span className="rounded-full bg-[var(--color-pink-50)] px-3 py-1.5 text-xs font-bold text-[var(--color-pink-dark)]">
                                Style and Comfort in Every Step
                            </span>
                        </div>

                        {product.description && (
                            <p
                                dir="auto"
                                style={{ unicodeBidi: "plaintext", textAlign: "start" }}
                                className="mb-7 whitespace-pre-line text-base leading-8 text-[var(--color-text-muted)]"
                            >
                                {product.description}
                            </p>
                        )}

                        <div className="mb-6 border-t border-[var(--color-border-soft)] pt-6">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="font-bold text-[var(--color-text-strong)]">
                                    Choose a Color
                                </h2>

                                {selectedColor !== null && (
                                    <span className="text-sm text-[var(--color-muted)]">
                                        {
                                            product.product_colors?.find(
                                                (color) =>
                                                    color.id === selectedColor
                                            )?.name
                                        }
                                    </span>
                                )}
                            </div>

                            {colors.length === 0 ? (
                                <p className="text-sm text-[var(--color-muted)]">
                                    {hasVariants
                                        ? "No colors are available for this product."
                                        : "This product is currently out of stock."}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {colors.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => chooseColor(color.id)}
                                            aria-label={`Select color ${color.name}`}
                                            aria-pressed={
                                                selectedColor === color.id
                                            }
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${selectedColor === color.id
                                                ? "border-[var(--color-primary)] bg-[var(--color-blue-50)] ring-2 ring-[var(--color-blue-100)]"
                                                : "border-[var(--color-border)] hover:border-[var(--color-pink-300)]"
                                                }`}
                                        >
                                            <span
                                                className="h-5 w-5 rounded-full border border-[var(--color-black-10)]"
                                                style={{
                                                    backgroundColor:
                                                        color.hex_code ||
                                                        "var(--color-border)",
                                                }}
                                            />

                                            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                                                {color.name}
                                            </span>

                                            {selectedColor === color.id && (
                                                <Check
                                                    size={15}
                                                    className="text-[var(--color-primary)]"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-6 border-t border-[var(--color-border-soft)] pt-6">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="font-bold text-[var(--color-text-strong)]">
                                    Choose a Size
                                </h2>

                                <span className="text-xs text-[var(--color-muted)]">
                                    Available sizes only
                                </span>
                            </div>

                            {selectedColor === null ? (
                                <p className="text-sm text-[var(--color-muted)]">
                                    Select a color first to see available sizes.
                                </p>
                            ) : sizes.length === 0 ? (
                                <p className="text-sm text-[var(--color-muted)]">
                                    No sizes are currently available in this color.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {sizes.map((size) => {
                                        const available = variants.some(
                                            (variant) =>
                                                variant.size_id === size.id &&
                                                variant.color_id === selectedColor &&
                                                Number(variant.stock_quantity) > 0
                                        );

                                        return (
                                            <button
                                                key={size.id}
                                                type="button"
                                                disabled={!available}
                                                onClick={() => {
                                                    setSelectedSize(size.id);
                                                    setQuantity(1);
                                                    setAddedToCart(false);
                                                    setCartError("");
                                                }}
                                                aria-pressed={
                                                    selectedSize === size.id
                                                }
                                                className={`min-w-14 rounded-xl border px-4 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${selectedSize === size.id
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-md shadow-[var(--color-blue-100)]"
                                                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-pink-300)] hover:bg-[var(--color-pink-50)]"
                                                    }`}
                                            >
                                                {size.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedVariant && (
                            <div className="mb-5 flex items-center gap-2 rounded-xl bg-[var(--color-blue-50)] px-4 py-3 text-sm text-[var(--color-blue-800)]">
                                <Check size={18} />
                                <span>
                                    In stock:{" "}
                                    <strong>
                                        {selectedVariant.stock_quantity}
                                    </strong>{" "}
                                    available
                                </span>
                            </div>
                        )}

                        <div className="mb-5 flex flex-wrap items-center gap-4">
                            <span className="font-bold text-[var(--color-text)]">
                                Quantity
                            </span>

                            <div className="flex items-center overflow-hidden rounded-xl border border-[var(--color-border)]">
                                <button
                                    type="button"
                                    onClick={() => changeQuantity(-1)}
                                    disabled={!selectedVariant || quantity <= 1}
                                    aria-label="Decrease quantity"
                                    className="flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] transition hover:bg-[var(--color-page)] disabled:opacity-30"
                                >
                                    <Minus size={16} />
                                </button>

                                <span
                                    className="min-w-12 text-center font-bold text-[var(--color-text-strong)]"
                                    aria-live="polite"
                                >
                                    {quantity}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => changeQuantity(1)}
                                    disabled={
                                        !selectedVariant ||
                                        quantity >=
                                        Number(selectedVariant.stock_quantity)
                                    }
                                    aria-label="Increase quantity"
                                    className="flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] transition hover:bg-[var(--color-page)] disabled:opacity-30"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {cartError && (
                            <p
                                role="alert"
                                className="mb-4 rounded-xl bg-[var(--color-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--color-danger-dark)]"
                            >
                                {cartError}
                            </p>
                        )}

                        {addedToCart && (
                            <div
                                role="status"
                                className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-success-dark)]"
                            >
                                <Check size={18} />
                                Product added to your cart successfully.

                                <Link
                                    to="/cart"
                                    className="ml-auto underline underline-offset-4"
                                >
                                    View Cart
                                </Link>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={addToCart}
                            disabled={!selectedVariant}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-6 py-4 text-base font-extrabold text-[var(--color-on-primary)] shadow-lg shadow-[var(--color-blue-100)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:bg-[var(--color-slate-300)] disabled:shadow-none"
                        >
                            <ShoppingBag size={21} />
                            {selectedVariant
                                ? "Add to Cart"
                                : "Select Color and Size"}
                        </button>

                        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[var(--color-border-soft)] pt-6 sm:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-page)] p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-blue-100)] text-[var(--color-primary-dark)]">
                                    <Truck size={20} />
                                </span>

                                <div>
                                    <p className="text-sm font-bold text-[var(--color-text)]">
                                        Home Delivery
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                        Shipping details at checkout
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-page)] p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pink-100)] text-[var(--color-pink-dark)]">
                                    <ShieldCheck size={20} />
                                </span>

                                <div>
                                    <p className="text-sm font-bold text-[var(--color-text)]">
                                        Easy Shopping
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                        Find the right product and size
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/products"
                            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary-dark)] transition hover:text-[var(--color-pink-dark)]"
                        >
                            <ArrowRight size={17} />
                            Continue Shopping
                        </Link>
                    </section>
                </div>

                {lightboxOpen && currentImage?.image_url && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Product image gallery"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="Close image gallery"
                            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white transition hover:bg-white/20"
                        >
                            ×
                        </button>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                showPreviousImage();
                            }}
                            aria-label="Previous image"
                            className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:bg-white/25 sm:left-6"
                        >
                            ‹
                        </button>

                        <div
                            className="flex max-h-full max-w-5xl flex-col items-center gap-3"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <img
                                src={currentImage.image_url}
                                alt={currentImage.alt_text || product.name}
                                className="max-h-[82vh] max-w-full rounded-xl object-contain"
                            />
                            <p className="text-sm font-medium text-white/80" dir="ltr">
                                {selectedImage + 1} / {images.length}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                showNextImage();
                            }}
                            aria-label="Next image"
                            className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:bg-white/25 sm:right-6"
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default ProductDetails;




