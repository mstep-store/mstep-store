# Kids & Co. 🧸

A modern e-commerce web application for children's clothing, built with React, Vite, Tailwind CSS, and Supabase.

## ✨ Overview

Kids & Co. is an online children's clothing store designed to provide a smooth and user-friendly shopping experience. Customers can browse products, explore available sizes and colors, add items to their cart, and proceed to checkout.

## 🚀 Features

- **Product Catalog** — Browse children's clothing products.
- **Product Variants** — Support for different colors and sizes.
- **Shopping Cart** — Add products, update quantities, and review cart items.
- **Checkout** — Enter customer and shipping details.
- **Cash on Delivery** — Support for cash-on-delivery orders.
- **Order Management** — Store order information and order items in Supabase.
- **Responsive Design** — A shopping experience designed for different screen sizes.
- **Database Integration** — Supabase integration for product and order data.

## 🛠️ Tech Stack

- **React** — User interface
- **Vite** — Development server and build tool
- **Tailwind CSS** — Styling
- **React Router** — Client-side routing
- **Supabase** — Database and backend services
- **JavaScript** — Application logic

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Ahmed-M00hamed/kids-and-co-store.git
```

### 2. Navigate to the project directory

```bash
cd kids-and-co-store
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root and add the environment variables required by your Supabase configuration.

For example, if your Supabase client uses Vite environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Use the exact variable names expected by your `supabase.js` file. Never put a Supabase service-role key or secret key in frontend environment variables.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

### 6. Build for production

```bash
npm run build
```

## 🗂️ Project Structure

The project is organized around reusable UI components, pages, and services.

```text
kids-and-co-store/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── package.json
└── README.md
```

*Note: The structure above is illustrative. Update it to match the actual folders and files in the repository.*

## 🔐 Security Notes

- Keep environment files and secret keys out of version control.
- Configure Supabase Row Level Security (RLS) policies appropriately.
- Validate product prices, stock availability, and order totals on the backend before accepting orders.
- Never expose privileged backend keys in client-side code.

## 📌 Project Status

This project is under development. Features and implementation details may change as development continues.

## 👨‍💻 Author

**Ahmed Mohamed**

- GitHub: [@Ahmed-M00hamed](https://github.com/Ahmed-M00hamed)
