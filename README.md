# Smart Retail Billing & Inventory Management System

A complete, functional, demo-ready **Retail Billing, Barcode Scanning, Inventory Management, and Sales Dashboard application** designed for supermarkets and retail shops (inspired by high-efficiency POS workflows like DMart).

---

## 🌟 Key Features

1. **New Bill / Fast POS Checkout:**
   - Barcode scanning via webcam/mobile rear camera with audio beep feedback.
   - Manual barcode/SKU entry with instant Enter-key processing.
   - Quick visual catalog with category filter tabs (Groceries, Dairy, Beverages, Snacks, Personal Care, Household, Bakery).
   - Quantity adjustment, item-level discounts, and whole-bill discount (% or flat ₹).
   - Dynamic GST/tax calculation with configurable rates.
   - Simulated payment modal supporting Cash (with smart denomination suggestions and change calculation), UPI QR, and Card.
   - Stock availability validation (prevents over-selling beyond available stock).
   - Dedicated print preview supporting both **80 mm Thermal Receipts** and **A4 Full-Page Tax Invoices**.
   - One-click PDF receipt export using `jsPDF`.

2. **Barcode Generator & Label Printing:**
   - Generates authentic, scannable **Code 128 barcodes** using `JsBarcode`.
   - Supports 3 standard label dimensions: `50 × 30 mm`, `40 × 30 mm`, and `38 × 25 mm`.
   - Single label printing, bulk batch printing, and **A4 Sticker Sheet Grid Layout**.
   - Configurable copies-per-product (e.g. print 10 labels for a received carton).

3. **Barcode Scanning (Webcam, Mobile Camera & Manual):**
   - High-performance barcode decoding via `@zxing/browser`.
   - Multi-camera device switching (prefers rear/environment camera on phones and tablets).
   - Audio beep synthesized via the Web Audio API on successful detection.
   - Continuous scanning mode with auto-debounce to prevent accidental duplicates.
   - Manual barcode fallback box available at all times.

4. **Product Catalog Management:**
   - 36 preloaded realistic supermarket products across 7 categories in Indian Rupees (₹).
   - Add, edit, and delete products with duplicate SKU and barcode validation.
   - Auto-generate unique barcodes and SKUs.
   - Profit margin calculation and stock status badges (In Stock, Low Stock, Out of Stock).
   - Full CSV Export & Import for bulk product management.

5. **Inventory & Stock Audit:**
   - Real-time stock tracking with live inventory valuation at cost price.
   - Three adjustment modes: **+ Stock In** (supplier delivery), **- Reduce** (damaged/expired write-off), and **Set Exact Qty** (audit reconciliation).
   - Comprehensive stock movement audit log recording every sale, receipt, and adjustment with timestamp and reason.
   - Critical low-stock and out-of-stock warning banners with direct restock shortcuts.

6. **Sales History & Invoicing:**
   - Complete ledger of all completed transactions with invoice search and date filtering (Today, Yesterday, Last 7 Days, This Month, All Time).
   - Filter by payment method (Cash, UPI, Card).
   - View invoice details, reprint receipts (reprinting never alters stock), and download PDF.
   - Export filtered transactions to CSV.

7. **Reports & Business Insights:**
   - Revenue analytics for Today, Last 7 Days, and Current Month.
   - Average bill value and sales volume statistics.
   - Visual charts powered by `Recharts`: Best-selling products (horizontal bar chart), category sales distribution (donut pie chart), and payment method share.
   - Stock valuation and movement analysis.

8. **Settings & Data Management:**
   - Store details customization (Shop name, address, phone, GSTIN, receipt footer note).
   - GST toggle, default GST rate, default barcode label size, and receipt layout preference.
   - **Full JSON Backup & Restore** for saving and loading complete demo states.
   - **Reset Demo Data** button with confirmation modal to restore the initial sample dataset at any time.

---

## 🛠️ Technology Stack

- **Frontend Framework:** React 19 + Vite
- **Language:** JavaScript (ES Modules) & JSX
- **Styling:** Standard CSS (No Tailwind CSS) with clean design system
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Routing:** `react-router-dom`
- **Barcode Rendering:** `jsbarcode`
- **Barcode Scanning:** `@zxing/browser` & `@zxing/library`
- **PDF Export:** `jspdf`
- **Data Persistence:** Browser `localStorage` (Zero database or backend server required)

---

## 🚀 How to Run the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Vite Development Server
```bash
npm run dev
```

The application will be served locally at:
- **Local:** `http://localhost:5173/`
- **Network:** `http://<your-local-ip>:5173/`

---

## 📷 Camera & Scanner Notes

- Modern web browsers require a **Secure Context** (`localhost` or `HTTPS`) to grant webcam access. Running locally on `http://localhost:5173` satisfies this requirement.
- When opening on a mobile browser over Wi-Fi, ensure your browser allows camera permissions for the local IP, or use the **Manual Barcode / SKU entry** box which functions seamlessly without any camera hardware.

---

## 🔒 Important Client Demo Notes

- **No Real Payments:** Checkout confirmations simulate transactions for demo purposes; no actual funds or bank gateways are charged.
- **Local Storage Isolation:** Data is stored in the local browser's `localStorage` and persists across page refreshes. Data is isolated to each browser profile.
