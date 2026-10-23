import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
  Eye,
  IndianRupee,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PrintStage from '../components/PrintStage';
import ReceiptModalView from '../components/Receipt';
import StatCard from '../components/StatCard';
import StockBadge from '../components/StockBadge';
import { useStore } from '../context/StoreContext';
import { inventoryValuePaise, totalUnits } from '../services/inventoryService';
import { getStockStatus } from '../services/productService';
import { formatINR } from '../utils/currencyUtils';
import { addDays, formatDate, formatDateTime, isSameDay, startOfDay } from '../utils/dateUtils';
import { paymentLabel } from '../utils/receiptUtils';

const PIE_COLORS = ['#3b6998', '#357a4a', '#ad6720', '#6f5d8e', '#3a7d77', '#b84242', '#45859e', '#9b7337'];

export default function Dashboard() {
  const { products, invoices, movements, shop, settings } = useStore();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const today = new Date();

  const todaysInvoices = invoices.filter((inv) => isSameDay(inv.createdAt, today) && inv.status === 'completed');
  const todaySales = todaysInvoices.reduce((s, i) => s + i.grandTotalPaise, 0);
  const lowStock = products.filter((p) => getStockStatus(p) === 'low');
  const outOfStock = products.filter((p) => getStockStatus(p) === 'out');
  const totalStockValuation = inventoryValuePaise(products);
  const totalUnitsCount = totalUnits(products);

  // Last 7 Days chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startOfDay(today), i - 6);
    const dayTotal = invoices
      .filter((inv) => isSameDay(inv.createdAt, day) && inv.status === 'completed')
      .reduce((s, inv) => s + inv.grandTotalPaise, 0);
    const dateLabel = day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return {
      name: day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      dateLabel,
      rupees: dayTotal / 100,
    };
  });

  // Current Month Trend data
  const daysInCurrentMonth = today.getDate();
  const monthTrend = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const total = invoices
      .filter((inv) => isSameDay(inv.createdAt, day) && inv.status === 'completed')
      .reduce((s, inv) => s + inv.grandTotalPaise, 0);
    return { name: `Day ${i + 1}`, rupees: total / 100 };
  });

  // Product and Category sales aggregation
  const productSales = new Map();
  const categorySales = new Map();

  invoices.forEach((inv) => {
    if (inv.status !== 'completed') return;
    inv.items.forEach((it) => {
      const prev = productSales.get(it.name) || { name: it.name, qty: 0, rupees: 0 };
      prev.qty += it.qty;
      prev.rupees += (it.lineTotalPaise || 0) / 100;
      productSales.set(it.name, prev);

      const product = products.find((p) => p.id === it.productId);
      const cat = product?.category || 'Groceries';
      categorySales.set(cat, (categorySales.get(cat) || 0) + (it.lineTotalPaise || 0) / 100);
    });
  });

  const bestSellers = [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  const categoryData = [...categorySales.entries()].map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Supermarket Dashboard</h1>
            <span className="demo-pill">LIVE POS DEMO</span>
          </div>
          <p className="muted">
            Live business performance, automated inventory alerts, and real-time sales metrics for {shop.name}.
          </p>
        </div>

        <div className="quick-actions">
          <Link to="/pos" className="btn btn-primary">
            <ShoppingCart size={18} /> New Bill (POS)
          </Link>
          <Link to="/products" className="btn btn-ghost">
            <Plus size={18} /> Add Product
          </Link>
          <Link to="/barcodes" className="btn btn-ghost">
            <Barcode size={18} /> Print Barcodes
          </Link>
          <Link to="/reports" className="btn btn-ghost">
            <Receipt size={18} /> Reports & Insights
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <section className="stat-grid">
        <StatCard
          icon={IndianRupee}
          label="Today’s Sales"
          value={formatINR(todaySales)}
          hint={`${todaysInvoices.length} bills generated today`}
          tone="blue"
        />
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={invoices.length}
          hint="Stored in local browser state"
          tone="green"
        />
        <StatCard
          icon={Package}
          label="Total Products"
          value={products.length}
          hint="Active in SKU catalogue"
        />
        <StatCard
          icon={Warehouse}
          label="Total Units in Stock"
          value={`${totalUnitsCount} units`}
          hint={`Valuation ${formatINR(totalStockValuation)}`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low-Stock Products"
          value={lowStock.length}
          hint="At or below minimum threshold"
          tone={lowStock.length ? 'orange' : undefined}
        />
        <StatCard
          icon={AlertCircle}
          label="Out of Stock"
          value={outOfStock.length}
          hint="Products with 0 inventory"
          tone={outOfStock.length ? 'red' : undefined}
        />
      </section>

      {/* Interactive Charts Section */}
      <section className="chart-grid">
        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Sales — Last 7 Days (₹)</h2>
            <TrendingUp size={18} color="var(--blue)" />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Daily Sales']}
                  labelFormatter={(lbl, items) => items?.[0]?.payload?.dateLabel || lbl}
                />
                <Bar dataKey="rupees" fill="var(--blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>This Month’s Sales Trend (₹)</h2>
            <IndianRupee size={18} color="var(--green)" />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="rupees"
                  stroke="var(--green)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Best-Selling Products (Qty Sold)</h2>
            <Package size={18} color="#0f766e" />
          </div>
          <div className="chart-box">
            {bestSellers.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bestSellers} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} units sold`, 'Volume']} />
                  <Bar dataKey="qty" fill="var(--blue)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted center" style={{ padding: '60px 0' }}>No sales recorded yet.</p>
            )}
          </div>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Sales Distribution by Category</h2>
            <Warehouse size={18} color="var(--orange)" />
          </div>
          <div className="chart-box">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted center" style={{ padding: '60px 0' }}>No sales recorded yet.</p>
            )}
          </div>
        </article>
      </section>

      {/* Additional Detail Sections: Transactions, Alerts, Best Sellers, Inventory Changes */}
      <section className="split-grid">
        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Recent Transactions</h2>
            <Link to="/sales" className="small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="plain-list">
            {invoices.slice(0, 6).map((inv) => (
              <li key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{inv.invoiceNumber}</strong>
                  <small>{formatDateTime(inv.createdAt)} · {paymentLabel(inv.paymentMethod)}</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{formatINR(inv.grandTotalPaise)}</strong>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setSelectedInvoice(inv)}
                    title="View Receipt"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Low-Stock Alerts</h2>
            <Link to="/inventory" className="small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage <ArrowRight size={14} />
            </Link>
          </div>
          {lowStock.concat(outOfStock).length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              All inventory items are currently above minimum threshold.
            </p>
          ) : (
            <ul className="plain-list">
              {lowStock.concat(outOfStock).slice(0, 6).map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.quantity} {p.unit} remaining (Min: {p.minStock})</small>
                  </div>
                  <StockBadge product={p} />
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Top-Selling Items</h2>
            <Link to="/reports" className="small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Analytics <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="plain-list">
            {bestSellers.slice(0, 6).map((p) => (
              <li key={p.name}>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.qty} units sold across demo bills</small>
                </div>
                <strong>₹{p.rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Recent Inventory Movements</h2>
            <Link to="/inventory" className="small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Audit log <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="plain-list">
            {movements.slice(0, 6).map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.productName}</strong>
                  <small>{m.type.toUpperCase()} · {formatDateTime(m.date)}</small>
                </div>
                <strong className={m.changeQty < 0 ? 'text-danger' : 'text-success'}>
                  {m.changeQty > 0 ? `+${m.changeQty}` : m.changeQty}
                </strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* Quick View Receipt Modal from Dashboard */}
      {selectedInvoice ? (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Invoice {selectedInvoice.invoiceNumber}</h3>
              <span className="muted small">{formatDateTime(selectedInvoice.createdAt)}</span>
            </div>
            <ReceiptModalView invoice={selectedInvoice} shop={shop} layout={settings.receiptLayout || '80mm'} />
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
