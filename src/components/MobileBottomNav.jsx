import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Menu,
  Package,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { getStockStatus } from '../services/productService';

export default function MobileBottomNav({ onOpenMenu }) {
  const { t } = useLanguage();
  const { customers, products } = useStore();
  const location = useLocation();

  const dueCustomersCount = useMemo(() => {
    return (customers || []).filter((c) => (c.balancePaise || 0) > 0).length;
  }, [customers]);

  const stockAlertCount = useMemo(() => {
    return (products || []).filter((p) => getStockStatus(p) !== 'in').length;
  }, [products]);

  const navItems = [
    {
      to: '/pos',
      label: 'Billing',
      icon: ShoppingCart,
      badge: null,
    },
    {
      to: '/khata',
      label: 'Khata',
      icon: BookOpen,
      badge: dueCustomersCount > 0 ? (dueCustomersCount > 9 ? '9+' : dueCustomersCount) : null,
      badgeTone: 'red',
    },
    {
      to: '/products',
      label: 'Products',
      icon: Package,
      badge: null,
    },
    {
      to: '/inventory',
      label: 'Stock',
      icon: Warehouse,
      badge: stockAlertCount > 0 ? (stockAlertCount > 9 ? '9+' : stockAlertCount) : null,
      badgeTone: 'orange',
    },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {navItems.map(({ to, label, icon: Icon, badge, badgeTone }) => {
        const isActive = location.pathname === to;
        return (
          <NavLink
            key={to}
            to={to}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon size={20} />
              {badge ? (
                <span className={`bottom-nav-badge tone-${badgeTone || 'blue'}`}>
                  {badge}
                </span>
              ) : null}
            </div>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        className="bottom-nav-item bottom-nav-menu-btn"
        onClick={onOpenMenu}
        aria-label="Open full menu"
      >
        <div className="bottom-nav-icon-wrap">
          <Menu size={20} />
        </div>
        <span className="bottom-nav-label">More</span>
      </button>
    </nav>
  );
}
