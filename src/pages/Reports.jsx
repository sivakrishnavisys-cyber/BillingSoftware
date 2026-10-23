import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import { inventoryValuePaise } from '../services/inventoryService';
import { getStockStatus } from '../services/productService';
import { formatINR } from '../utils/currencyUtils';
import { addDays, endOfDay, formatDateTime, isSameDay, startOfDay } from '../utils/dateUtils';
import { BarChart3, IndianRupee, PieChart as PieIcon, Receipt, ShoppingBag, TrendingUp, Warehouse } from 'lucide-react';

const CHART_COLORS = ['#3b6998', '#357a4a', '#ad6720', '#6f5d8e', '#3a7d77', '#b84242', '#45859e'];

export default function Reports() {
  const { invoices, products, movements } = useStore();
  const today = new Date();

  const [from, setFrom] = useState(() => {
    const d = addDays(today, -29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => today.toISOString().slice(0, 10));

  const applyPreset = (preset) => {
    if (preset === 'today') {
      const d = today.toISOString().slice(0, 10);
      setFrom(d);
      setTo(d);
    } else if (preset === 'week') {
      setFrom(addDays(today, -6).toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setFrom(firstDay);
      setTo(today.toISOString().slice(0, 10));
    } else if (preset === 'last30') {
      setFrom(addDays(today, -29).toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setFrom('');
      setTo('');
    }
  };

  const inRangeInvoices = useMemo(() => invoices.filter((inv) => {
    if (inv.status !== 'completed') return false;
    const t = new Date(inv.createdAt).getTime();
    if (from && t < startOfDay(from).getTime()) return false;
    if (to && t > endOfDay(to).getTime()) return false;
    return true;
  }), [invoices, from, to]);

  const rangeRevenue = inRangeInvoices.reduce((s, i) => s + i.grandTotalPaise, 0);
  const totalBillsCount = inRangeInvoices.length;
  const avgBillValue = totalBillsCount ? Math.round(rangeRevenue / totalBillsCount) : 0;

  const todayRevenue = invoices
    .filter((i) => isSameDay(i.createdAt, today) && i.status === 'completed')
    .reduce((s, i) => s + i.grandTotalPaise, 0);

  const weekRevenue = invoices
    .filter((i) => new Date(i.createdAt) >= addDays(startOfDay(today), -6) && i.status === 'completed')
    .reduce((s, i) => s + i.grandTotalPaise, 0);

  const monthRevenue = invoices
    .filter((i) => {
      const d = new Date(i.createdAt);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && i.status === 'completed';
    })
    .reduce((s, i) => s + i.grandTotalPaise, 0);

  const productMap = new Map();
  const categoryMap = new Map();
  const paymentMap = { cash: 0, upi: 0, card: 0 };

  inRangeInvoices.forEach((inv) => {
    const key = (inv.paymentMethod || 'cash').toLowerCase();
    paymentMap[key] = (paymentMap[key] || 0) + (inv.grandTotalPaise || 0) / 100;

    inv.items.forEach((it) => {
      const prev = productMap.get(it.name) || { name: it.name, qty: 0, rupees: 0 };
      prev.qty += it.qty;
      prev.rupees += (it.lineTotalPaise || 0) / 100;
      productMap.set(it.name, prev);

      const p = products.find((x) => x.id === it.productId);
      const cat = p?.category || 'Groceries';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (it.lineTotalPaise || 0) / 100);
    });
  });

  const topProducts = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const categoriesData = [...categoryMap.entries()].map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));
  const paymentData = Object.entries(paymentMap)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.toUpperCase(),
      value: Math.round(value),
    }));

  const lowStock = products.filter((p) => getStockStatus(p) !== 'in');
  const inventoryValue = inventoryValuePaise(products);

  return (
    <div className="reports-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Business Reports & Analytics</h1>
            <span className="demo-pill">REVENUE INSIGHTS</span>
          </div>
          <p className="muted">
            Aggregated sales analytics, category breakdowns, payment methods, and live stock audit figures.
          </p>
        </div>

        <div className="filter-presets-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="chip" onClick={() => applyPreset('today')}>Today</button>
          <button type="button" className="chip" onClick={() => applyPreset('week')}>Last 7 Days</button>
          <button type="button" className="chip" onClick={() => applyPreset('month')}>This Month</button>
          <button type="button" className="chip" onClick={() => applyPreset('last30')}>Last 30 Days</button>
          <button type="button" className="chip" onClick={() => applyPreset('all')}>All Time</button>
        </div>
      </div>

      <div className="card filter-bar" style={{ marginBottom: 16 }}>
        <span className="small muted">Custom Date Range:</span>
        <label className="field" style={{ minWidth: '140px' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Start date" />
        </label>
        <span className="muted">to</span>
        <label className="field" style={{ minWidth: '140px' }}>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="End date" />
        </label>
      </div>

      <section className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard
          icon={IndianRupee}
          label="Today’s Revenue"
          value={formatINR(todayRevenue)}
          tone="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Last 7 Days"
          value={formatINR(weekRevenue)}
          tone="green"
        />
        <StatCard
          icon={ShoppingBag}
          label="This Month"
          value={formatINR(monthRevenue)}
        />
        <StatCard
          icon={Receipt}
          label="Bills in Range"
          value={totalBillsCount}
          hint={`Average Bill: ${formatINR(avgBillValue)}`}
        />
      </section>

      {!inRangeInvoices.length ? (
        <EmptyState
          title="No sales in selected date range"
          message="Try choosing 'Last 30 Days' or 'All Time' from the presets above."
        />
      ) : (
        <section className="chart-grid">
          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Top-Selling Products by Volume</h2>
              <BarChart3 size={18} color="var(--blue)" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} units sold`, 'Volume']} />
                  <Bar dataKey="qty" fill="var(--blue)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Category Sales Distribution (₹)</h2>
              <PieIcon size={18} color="var(--green)" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoriesData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {categoriesData.map((c, i) => (
                      <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Payment Method Share (₹)</h2>
              <Receipt size={18} color="var(--orange)" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {paymentData.map((c, i) => (
                      <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ margin: '0 0 12px' }}>Filtered Range Totals</h2>
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted small">Total Range Revenue:</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--blue)' }}>
                {formatINR(rangeRevenue)}
              </div>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted small">Current Total Stock Valuation (At Cost):</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)' }}>
                {formatINR(inventoryValue)}
              </div>
            </div>
            <div style={{ padding: '12px 0' }}>
              <span className="muted small">Bills Completed in Range:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {totalBillsCount} Invoices
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Stock Alerts & Movements Summary */}
      <section className="split-grid" style={{ marginTop: 16 }}>
        <article className="card">
          <h2 style={{ margin: '0 0 10px' }}>Stock Alert Summary ({lowStock.length})</h2>
          <ul className="plain-list">
            {lowStock.length === 0 ? (
              <li className="muted">All catalog items are stocked above their threshold.</li>
            ) : (
              lowStock.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.category} · Min: {p.minStock}</small>
                  </div>
                  <strong className={p.quantity <= 0 ? 'text-danger' : 'text-orange'}>
                    {p.quantity} {p.unit}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="card">
          <h2 style={{ margin: '0 0 10px' }}>Recent Audit Movements</h2>
          <ul className="plain-list">
            {movements.slice(0, 8).map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.productName}</strong>
                  <small>{m.type.toUpperCase()}{m.invoiceNumber ? ` #${m.invoiceNumber}` : ''} · {formatDateTime(m.date)}</small>
                </div>
                <strong className={m.changeQty > 0 ? 'text-success' : 'text-danger'}>
                  {m.changeQty > 0 ? `+${m.changeQty}` : m.changeQty}
                </strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
