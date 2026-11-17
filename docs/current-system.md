# Current System Documentation — Kids & Co. E-commerce

Living map of the existing application. Derived from source code; contains no secrets.

## Entry Points
- `index.html` mounts `#root` and loads `/src/main.jsx`.
- `src/main.jsx` renders React root wrapped in `StrictMode`, `BrowserRouter`, and `AuthProvider`.
- `src/App.jsx` defines all routes.

## Route Table

### Storefront (layout: `MainLayout`)
| Path | Page |
|---|---|
| `/` | `pages/store/Home` |
| `/products` | `pages/store/Products` |
| `/products/:id` | `pages/store/ProductDetails` |
| `/cart` | `pages/store/Cart` |
| `/checkout` | `pages/store/Checkout` |
| `/contact` | `pages/store/Contact` |
| `/track-order` | `pages/store/TrackOrder` |
| `/order-success` | `pages/store/OrderSuccess` |
| `*` (404) | `pages/store/NotFound` |

### Admin
| Path | Page | Guard |
|---|---|---|
| `/admin/login` | `pages/admin/Login` | none |
| `/admin` (index) | `pages/admin/Dashboard` | `ProtectedRoute` + `AdminLayout` |
| `/admin/products` | `pages/admin/Products` | protected |
| `/admin/products/:id/variants` | `pages/admin/ProductVariants` | protected |
| `/admin/orders` | `pages/admin/Orders` | protected |
| `/admin/categories` | `pages/admin/Categories` | protected |
| `/admin/messages` | `pages/admin/Messages` | protected |

## Components
- Shared: `components/Navbar.jsx`, `Footer.jsx`, `Loader.jsx`, `ScrollToTop.jsx`.
- Admin: `components/admin/ProtectedRoute.jsx`, `StatusBadge.jsx`.
- Store home: `components/store/home/{Hero,BestSellers,CategoryGrid,StoreBenefits}.jsx`.

## Layouts
- `layouts/MainLayout.jsx` — storefront chrome.
- `layouts/AdminLayout.jsx` — admin chrome.

## Hooks
- `hooks/useAuth.js` — auth state consumer.
- `hooks/useProducts.js` — product data fetching.

## Context
- `contexe/AuthContext.jsx` — auth provider.
- `contexe/authContextValue.js` — context value.

## Services (`src/services/`)
- `supabase.js` — Supabase client (env-driven, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- `productService.js` — product queries.
- `adminProductService.js` — admin product/variant operations.
- `orderService.js` — order creation and retrieval.
- `contactService.js` — contact message submission.

## Utilities (`src/utils/`)
- `categorySlug.js`, `formatPrice.js`, `orderStatus.js`, `recentOrders.js`, `validators.js`.

## Config
- `src/config/store.js` — store configuration.

## Assets
- 22 image files (`images 1.jpg` through `images 22.jpg`) — product imagery.

## Data Flow
UI components → hooks/services → `supabase.js` client → Supabase backend.
- Admin writes go through `adminProductService`, `orderService`, and `contactService`.

## Cart & Checkout Price Behavior

### Current Behavior (implemented)
- Cart stores the selected variant price in `localStorage` (`src/pages/store/ProductDetails.jsx`).
- Checkout computes totals from the stored cart price.
- No price-change approval or revalidation flow exists yet.

### Target Behavior (not yet implemented)
- Retain the added price as a comparison reference only.
- Recalculate current variant prices/discounts and shipping from the database at checkout.
- Block order creation on mismatch and show previous vs new prices.
- Require explicit customer approval; update cart after approval and revalidate.
- Final atomic order creation recomputes and verifies all prices.
- No order or stock changes on rejection or failed verification.
## Supabase Entities (verified in source)
Tables referenced by services:
- `products`, `categories`
- `product_images`, `product_colors`, `product_sizes`, `product_variants`
- `orders`, `order_items`
- `contact_messages`
- `store_admins`

Storage:
- Bucket `product-images` (used by `adminProductService`).

RPCs:
- `get_public_best_sellers`
- `track_order`
- `cancel_order`

## Unverified / Requires Verification
- Exact schema, constraints, RLS policies, and indexes are defined in Supabase and were not inspected here.
- Admin CRUD coverage for categories and variants was not exhaustively reviewed (service file is large); confirm each operation in `adminProductService.js`.
- Customer-facing order cancellation flow depends on `cancel_order` RPC; behavior not fully reviewed.
- Best-seller aggregation and published-product visibility depend on DB functions/policies not inspected.
- Dashboard metrics and admin message management behavior require page-level review.
- No `.env` or secret values were accessed; env vars referenced by name only.

## Styling
- Tailwind v4 imported in `src/index.css` via `@import "tailwindcss"`.
- Design tokens defined as CSS variables (`--color-navy`, `--color-blue`, etc.).
- Global base styles in `src/index.css`.

## Deployment
- Vite build (`npm run build`) outputs to `dist/`.
- `vercel.json` rewrites all paths to `/index.html` for SPA routing.
- `public/_redirects` was removed in Feature 004 (Vercel uses `vercel.json`).
- `public/favicon.svg` is the favicon.

## Product Discounts (Feature 003)
- One optional discount per product on `products` (`discount_type` = `percentage` | `fixed`, `discount_value`, `discount_start_at`, `discount_end_at`). It applies to the price of every variant of that product.
- Window: start inclusive, end exclusive. Outside the window the discount is ignored, not deleted. A discount that would make a price <= 0 is ignored.
- Display: `src/utils/pricing.js` (client clock, display only) -> `PriceTag` on listing/home/best-sellers cards, strike-through + badge on `ProductDetails`, original price in `Cart`.
- Admin: discount fields in the product form (`src/pages/admin/Products.jsx`); validated in `adminProductService.js` (`normalizeProductDiscount`).
- Checkout: `Checkout.jsx` revalidates cart prices (variant price + product discount) and requires approval of changes. `submit_checkout_order` recomputes every price from the database using database time; client prices/totals are never trusted.
- Variant-level discount columns (`product_variants.discount_*`, Feature 001) are dormant: not read by the storefront or by `submit_checkout_order`.
- Migration: `supabase/migrations/20261117000001_product_discounts.sql` (rollback in `supabase/rollback/`).

