import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Barcode,
  BookOpen,
  CheckCircle2,
  Command,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { getStockStatus } from '../services/productService';

export default function Sidebar({ shopName, isOpen = false, onClose = () => {} }) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { customers, products, suppliers = [], staff = [] } = useStore();

  const dueCustomersCount = useMemo(() => {
    return (customers || []).filter((c) => (c.balancePaise || 0) > 0).length;
  }, [customers]);

  const dueSuppliersCount = useMemo(() => {
    return (suppliers || []).filter((s) => (s.balancePaise || 0) > 0).length;
  }, [suppliers]);

  const activeStaffCount = useMemo(() => {
    return (staff || []).filter((s) => s.status === 'Active').length;
  }, [staff]);

  const stockAlertCount = useMemo(() => {
    return (products || []).filter((p) => getStockStatus(p) !== 'in').length;
  }, [products]);

  const allNavLinks = [
    {
      to: '/',
      label: t('nav_dashboard'),
      icon: LayoutDashboard,
    },
    {
      to: '/pos',
      label: t('nav_pos'),
      icon: ShoppingCart,
      badge: 'FAST',
      badgeTone: 'blue',
    },
    {
      to: '/khata',
      label: t('nav_khata'),
      icon: BookOpen,
      badge: dueCustomersCount > 0 ? `${dueCustomersCount} Due` : null,
      badgeTone: 'red',
    },
    {
      to: '/products',
      label: t('nav_products'),
      icon: Package,
      badge: products.length ? String(products.length) : null,
      badgeTone: 'gray',
    },
    {
      to: '/inventory',
      label: t('nav_inventory'),
      icon: Warehouse,
      badge: stockAlertCount > 0 ? `${stockAlertCount} Alert` : null,
      badgeTone: 'orange',
    },
    {
      to: '/suppliers',
      label: t('nav_suppliers'),
      icon: Truck,
      badge: dueSuppliersCount > 0 ? `${dueSuppliersCount} Due` : (suppliers.length ? String(suppliers.length) : null),
      badgeTone: dueSuppliersCount > 0 ? 'orange' : 'gray',
    },
    {
      to: '/staff',
      label: t('nav_staff'),
      icon: Users,
      badge: activeStaffCount > 0 ? `${activeStaffCount} On` : null,
      badgeTone: 'green',
    },
    {
      to: '/barcodes',
      label: t('nav_barcodes'),
      icon: Barcode,
    },
    {
      to: '/sales',
      label: t('nav_sales'),
      icon: History,
    },
    {
      to: '/reports',
      label: t('nav_reports'),
      icon: BarChart3,
      adminOnly: true,
    },
    {
      to: '/settings',
      label: t('nav_settings'),
      icon: Settings,
      adminOnly: true,
    },
  ];

  const visibleLinks = allNavLinks.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {isOpen ? (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside className={`sidebar modern-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-aligned">
          <div className="brand-logo-icon">
            <Store size={20} color="#fff" />
          </div>
          <div className="brand-text-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <strong>{shopName}</strong>
              <CheckCircle2 size={12} color="#8ab4dc" />
            </div>
            <span>Supermarket & POS</span>
          </div>

          {/* Close button on mobile drawer */}
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {visibleLinks.map(({ to, label, icon: Icon, badge, badgeTone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                onClose();
              }}
            >
              <div className="nav-icon-wrap">
                <Icon size={16} />
              </div>
              <span className="nav-label">{label}</span>
              {badge ? (
                <span className={`nav-badge-pill tone-${badgeTone || 'blue'}`}>
                  {badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer Card */}
        <div className="sidebar-footer-card">
          <div className="shortcuts-hint-row">
            <Command size={12} />
            <span>Shortcuts: <strong>Enter</strong> Bill · <strong>F2</strong> Search</span>
          </div>
          <div className="offline-status-row">
            <span className="green-pulse-dot" />
            <span>Local Storage · Offline Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
