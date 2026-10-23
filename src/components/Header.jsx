import { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Globe,
  LogOut,
  Menu,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { getStockStatus } from '../services/productService';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { formatINR } from '../utils/currencyUtils';

export default function Header({ shopName, onReset, onToggleSidebar }) {
  const { language, languages, changeLanguage, t } = useLanguage();
  const { currentUser, logout, isAdmin } = useAuth();
  const { products, customers, invoices } = useStore();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readIds, setReadIds] = useState(new Set());

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Compute live notifications from store state
  const notifications = useMemo(() => {
    const list = [];

    // 1. Expired Items Alert (Critical)
    const now = new Date();
    products
      .filter((p) => p.expiryDate && new Date(p.expiryDate) < now)
      .slice(0, 3)
      .forEach((p) => {
        list.push({
          id: `exp-${p.id}`,
          type: 'danger',
          icon: AlertCircle,
          title: `Expired Item: ${p.name}`,
          message: `Expired on ${p.expiryDate}. Please remove from retail shelf immediately.`,
          link: '/inventory',
          time: 'Expired',
        });
      });

    // 2. Expiring Soon Alert (< 30 days)
    products
      .filter((p) => {
        if (!p.expiryDate) return false;
        const diffMs = new Date(p.expiryDate) - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      })
      .slice(0, 3)
      .forEach((p) => {
        const diffDays = Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
        list.push({
          id: `exp-soon-${p.id}`,
          type: 'warning',
          icon: Clock,
          title: `Expiring in ${diffDays} Days: ${p.name}`,
          message: `Batch ${p.batchNo || 'current'} expires on ${p.expiryDate}. Plan clearance or return.`,
          link: '/inventory',
          time: `${diffDays}d left`,
        });
      });

    // 3. Out of stock items
    products
      .filter((p) => getStockStatus(p) === 'out')
      .slice(0, 2)
      .forEach((p) => {
        list.push({
          id: `out-${p.id}`,
          type: 'danger',
          icon: AlertCircle,
          title: `Out of Stock: ${p.name}`,
          message: `Zero quantity remaining in store. Needs replenishment.`,
          link: '/inventory',
          time: 'Urgent',
        });
      });

    // 4. Low stock items
    products
      .filter((p) => getStockStatus(p) === 'low')
      .slice(0, 2)
      .forEach((p) => {
        list.push({
          id: `low-${p.id}`,
          type: 'warning',
          icon: AlertTriangle,
          title: `Low Stock: ${p.name}`,
          message: `Only ${p.quantity} ${p.unit} remaining (Min threshold: ${p.minStock}).`,
          link: '/inventory',
          time: 'Low Stock',
        });
      });

    // 3. Khata Pending Due
    customers
      .filter((c) => (c.balancePaise || 0) > 300000) // > ₹3,000
      .slice(0, 2)
      .forEach((c) => {
        list.push({
          id: `khata-${c.id}`,
          type: 'info',
          icon: BookOpen,
          title: `High Khata Due: ${c.name}`,
          message: `Outstanding balance is ${formatINR(c.balancePaise)}. Send reminder.`,
          link: '/khata',
          time: 'Follow up',
        });
      });

    // 4. Recent completed sale
    if (invoices.length > 0) {
      const last = invoices[0];
      list.push({
        id: `sale-${last.id}`,
        type: 'success',
        icon: ShoppingBag,
        title: `Recent Bill: ${last.invoiceNumber}`,
        message: `Total ${formatINR(last.grandTotalPaise)} paid by ${last.paymentMethod?.toUpperCase()}.`,
        link: '/sales',
        time: 'Just now',
      });
    }

    return list;
  }, [products, customers, invoices]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  return (
    <header className="topbar modern-topbar">
      <div className="topbar-left-wrap">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-title">
          <strong className="topbar-shop-name">{shopName}</strong>
          <span className="topbar-date hide-on-mobile">{formatDate(new Date())}</span>
          <div className="online-indicator-pill hide-on-mobile">
            <span className="live-dot" />
            <span>{t('terminal_online')}</span>
          </div>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Language Translations Dropdown Selector */}
        <div className="language-selector-wrap" title="Change Language / भाषा बदलें">
          <Globe size={14} color="var(--blue)" className="globe-icon" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="language-dropdown"
            aria-label="Select Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="notif-wrapper" ref={notifRef}>
          <button
            type="button"
            className="icon-btn notif-bell-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell size={17} color="#475569" />
            {unreadCount > 0 ? (
              <span className="notif-badge-count">{unreadCount}</span>
            ) : null}
          </button>

          {notifOpen ? (
            <div className="notif-popover-card animate-popIn">
              <div className="notif-header">
                <div>
                  <strong>Notifications</strong>
                  <span className="muted tiny" style={{ marginLeft: 6 }}>
                    ({unreadCount} new)
                  </span>
                </div>
                {unreadCount > 0 ? (
                  <button type="button" className="btn-link tiny" onClick={markAllRead}>
                    Mark all read
                  </button>
                ) : null}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="empty-state tiny">No new alerts.</div>
                ) : (
                  notifications.map((n) => {
                    const Icon = n.icon;
                    const isRead = readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        className={`notif-item ${isRead ? 'read' : 'unread'} tone-${n.type}`}
                        onClick={() => {
                          setReadIds((prev) => new Set([...prev, n.id]));
                          setNotifOpen(false);
                          navigate(n.link);
                        }}
                      >
                        <div className={`notif-icon-circle ${n.type}`}>
                          <Icon size={14} />
                        </div>
                        <div className="notif-content">
                          <div className="notif-title-row">
                            <strong>{n.title}</strong>
                            <span className="notif-time">{n.time}</span>
                          </div>
                          <p className="notif-message">{n.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* User Profile Badge & Dropdown */}
        <div className="user-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="user-profile-pill"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User Profile"
          >
            <div className={`user-avatar-badge ${isAdmin ? 'admin-avatar' : 'subadmin-avatar'}`}>
              {currentUser?.avatar || 'U'}
            </div>
            <div className="user-pill-info hide-on-mobile">
              <span className="user-pill-name">{currentUser?.name?.split(' ')[0] || 'User'}</span>
              <span className={`user-role-tag ${isAdmin ? 'admin-tag' : 'subadmin-tag'}`}>
                {isAdmin ? 'Admin' : 'Sub-Admin'}
              </span>
            </div>
          </button>

          {profileOpen ? (
            <div className="profile-dropdown-card animate-popIn">
              <div className="profile-dropdown-head">
                <div className={`user-avatar-badge large ${isAdmin ? 'admin-avatar' : 'subadmin-avatar'}`}>
                  {currentUser?.avatar || 'U'}
                </div>
                <div>
                  <strong>{currentUser?.name}</strong>
                  <div className="muted tiny">{currentUser?.email}</div>
                  <span className={`badge ${isAdmin ? 'badge-in' : 'badge-low'}`} style={{ marginTop: 4 }}>
                    {currentUser?.roleLabel}
                  </span>
                </div>
              </div>

              <div className="profile-dropdown-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', color: '#dc2626' }}
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Reset Demo button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm reset-demo-header-btn hide-on-mobile"
          onClick={onReset}
          title="Restore initial sample data"
        >
          <RotateCcw size={13} />
          <span>{t('reset_demo')}</span>
        </button>
      </div>
    </header>
  );
}
