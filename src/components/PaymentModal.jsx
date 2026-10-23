import { useMemo, useState, useEffect } from 'react';
import { Banknote, BookOpen, Check, CreditCard, Smartphone, UserPlus } from 'lucide-react';
import { formatINR, parseRupeeInput } from '../utils/currencyUtils';

const METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'khata', label: 'Khata (Udhar)', icon: BookOpen },
];

export default function PaymentModal({
  open,
  totalPaise,
  initialMethod = 'cash',
  selectedCustomer = null,
  customers = [],
  onCancel,
  onConfirm,
}) {
  const [method, setMethod] = useState(initialMethod);
  const [amount, setAmount] = useState('');
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || '');
  const [customerName, setCustomerName] = useState(selectedCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(selectedCustomer?.phone || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMethod(initialMethod);
      if (selectedCustomer) {
        setCustomerId(selectedCustomer.id);
        setCustomerName(selectedCustomer.name);
        setCustomerPhone(selectedCustomer.phone || '');
      } else {
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
      }
      setAmount('');
      setError('');
    }
  }, [open, initialMethod, selectedCustomer]);

  const exactRupees = (totalPaise / 100).toFixed(2);
  const paidPaise = method === 'cash' ? parseRupeeInput(amount || exactRupees) : totalPaise;
  const changePaise = method === 'cash' ? Math.max(0, paidPaise - totalPaise) : 0;

  const currentCustomerObj = useMemo(() => {
    if (!customerId) return null;
    return customers.find((c) => c.id === customerId);
  }, [customerId, customers]);

  const quickCash = useMemo(() => {
    const rupees = totalPaise / 100;
    const rounded = [10, 20, 50, 100, 200, 500, 1000, 2000]
      .map((n) => Math.ceil(rupees / n) * n)
      .filter((n, i, arr) => n >= rupees && arr.indexOf(n) === i)
      .slice(0, 5);
    return rounded;
  }, [totalPaise]);

  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    if (!id) {
      setCustomerName('');
      setCustomerPhone('');
      return;
    }
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  if (!open) return null;

  const submit = () => {
    setError('');
    if (method === 'cash' && paidPaise < totalPaise) {
      setError(`Cash received (${formatINR(paidPaise)}) is less than total due (${formatINR(totalPaise)}).`);
      return;
    }

    if (method === 'khata') {
      if (!customerId && !customerName.trim()) {
        setError('Please select or enter a customer name for Khata (Udhar) billing.');
        return;
      }
    }

    if (customerPhone && !/^[0-9]{10}$/.test(customerPhone.trim())) {
      setError('Please enter a valid 10-digit customer mobile number, or leave it empty.');
      return;
    }

    onConfirm({
      paymentMethod: method,
      amountPaidPaise: method === 'cash' ? paidPaise : totalPaise,
      customerId: customerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card payment-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Checkout & Payment</h3>
          <span className="demo-pill">FAST POS</span>
        </div>

        <div className="payment-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Total Amount Payable:</span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--blue)' }}>{formatINR(totalPaise)}</strong>
        </div>

        {/* Payment Method Selector */}
        <div className="method-grid payment-methods-selector">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`method-btn ${method === id ? 'active' : ''}`}
              onClick={() => setMethod(id)}
              style={id === 'khata' && method === id ? { borderColor: 'var(--orange)', background: 'var(--orange-light)', color: 'var(--orange)' } : {}}
            >
              <Icon size={20} color={method === id ? (id === 'khata' ? 'var(--orange)' : 'var(--blue)') : '#67788c'} />
              <span style={{ fontSize: '0.82rem' }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Cash Tender Calculation */}
        {method === 'cash' ? (
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border)', margin: '10px 0' }}>
            <label className="field">
              <span>Cash Received From Customer (₹)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={exactRupees}
                autoFocus
              />
              <div className="quick-cash">
                <button
                  type="button"
                  className="chip"
                  style={{ background: 'var(--blue-light)', borderColor: 'var(--blue)', fontWeight: 700 }}
                  onClick={() => setAmount(exactRupees)}
                >
                  Exact (₹{exactRupees})
                </button>
                {quickCash.map((n) => (
                  <button type="button" key={n} className="chip" onClick={() => setAmount(String(n))}>
                    ₹{n}
                  </button>
                ))}
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
              <span>Change to Return:</span>
              <strong style={{ fontSize: '1.25rem', color: changePaise > 0 ? 'var(--green)' : 'var(--text)' }}>
                {formatINR(changePaise)}
              </strong>
            </div>
          </div>
        ) : null}

        {/* UPI or Card notice */}
        {method === 'upi' || method === 'card' ? (
          <div className="alert alert-info" style={{ margin: '10px 0' }}>
            <Check size={18} />
            <span>Simulating payment clearance via <strong>{method.toUpperCase()}</strong>.</span>
          </div>
        ) : null}

        {/* Khata Credit details */}
        {method === 'khata' ? (
          <div style={{ background: 'var(--orange-light)', padding: 12, borderRadius: 8, border: '1px solid var(--orange-border)', margin: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--orange)', fontWeight: 700, marginBottom: 6 }}>
              <BookOpen size={16} />
              <span>Bill will be added to Customer Khata (Udhar)</span>
            </div>
            {currentCustomerObj ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--orange-dark)' }}>
                <div>Current Due: <strong>{formatINR(currentCustomerObj.balancePaise || 0)}</strong></div>
                <div>New Due After Bill: <strong>{formatINR((currentCustomerObj.balancePaise || 0) + totalPaise)}</strong></div>
                <div>Credit Limit: {formatINR(currentCustomerObj.creditLimitPaise || 0)}</div>
              </div>
            ) : (
              <p className="tiny muted" style={{ margin: 0 }}>
                Select an existing customer or enter customer name below to record this purchase on their account.
              </p>
            )}
          </div>
        ) : null}

        {/* Customer Selector / Form */}
        <div style={{ marginTop: 10 }}>
          <label className="field" style={{ marginBottom: 8 }}>
            <span>Select Customer for Bill / Khata:</span>
            <select
              value={customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
            >
              <option value="">Walk-in Customer (Counter Sale)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — Due: {formatINR(c.balancePaise || 0)}
                </option>
              ))}
            </select>
          </label>

          {!customerId ? (
            <div className="form-grid two">
              <label className="field">
                <span>Customer Name {method === 'khata' ? '*' : '(Optional)'}</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                />
              </label>
              <label className="field">
                <span>Mobile Number (Optional)</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                />
              </label>
            </div>
          ) : null}
        </div>

        {error ? <p className="alert alert-error" style={{ marginTop: 10 }}>{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={submit}
            style={method === 'khata' ? { background: 'var(--orange)', borderColor: 'var(--orange)' } : {}}
          >
            {method === 'khata' ? 'Add to Khata & Print' : `Confirm Payment (${formatINR(totalPaise)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
