# Technical Architecture — Kids & Co. E-commerce

## Stack
- React 19 SPA bundled by Vite 8.
- Tailwind CSS 4 via `@tailwindcss/vite` plugin.
- React Router 8 for client-side routing.
- Supabase JS 2 for data/auth.
- JavaScript ESM.

## Application Shell
- `index.html` → `src/main.jsx` → `BrowserRouter` → `AuthProvider` → `App`.
- `App.jsx` declares all routes with nested layouts.

## Routing Model
- Storefront routes share `MainLayout`.
- Admin routes share `AdminLayout` under `ProtectedRoute`.
- 404 fallback under `MainLayout`.
- SPA fallback configured in `vercel.json` and `public/_redirects`.

## State Management
- Auth state via `AuthContext` + `useAuth`.
- Local component state for UI/forms.
- No global store library; do not introduce one without approval.

## Data Layer
- Single Supabase client in `src/services/supabase.js` (env-driven).
- Domain services encapsulate queries (`productService`, `orderService`, etc.).
- Hooks (`useProducts`) consume services.
- Data layer guideline: components should consume hooks/services; avoid direct Supabase calls in components where a service exists.

## Styling
- Tailwind utility classes.
- CSS variables in `src/index.css` for brand colors.
- Global reset/base styles in `src/index.css`.

## Configuration
- Vite config enables React + Tailwind plugins.
- ESLint flat config for `**/*.{js,jsx}`.
- Env vars prefixed with `VITE_` for client exposure.

## Build & Deploy
- `npm run dev` — dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview build.
- `npm run lint` — lint.
- Deployed to Vercel with SPA rewrite.

## Order Creation (Target)
- Trusted atomic RPC (`submit_checkout_order`) validates prices, discounts,
  shipping, stock, and creates order/items atomically.
- Quote/approval flow: server-stored quote snapshot, 15-min TTL, explicit
  customer approval for product and shipping price changes.
- No client-trusted prices, totals, or approval flags.
- Legacy RPC `create_store_order` is inspected only; target RPC is `submit_checkout_order`.

## Extension Guidelines
- Add new pages under `src/pages/store/` or `src/pages/admin/`.
- Register routes in `src/App.jsx` (additive).
- Add new services under `src/services/`.
- Reuse `MainLayout`/`AdminLayout`.
- Follow existing component and naming conventions.
- Do not rename `src/contexe`.
