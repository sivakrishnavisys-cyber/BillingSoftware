import { useState } from 'react';
import { CheckCircle2, Globe, KeyRound, Lock, ShieldCheck, Store, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';

export default function Login() {
  const { login, quickLogin, demoUsers } = useAuth();
  const { language, languages, changeLanguage, t } = useLanguage();
  const { shop } = useStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      login(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Top Language Selector */}
        <div className="login-lang-row">
          <div className="language-selector-wrap" title="Change Language">
            <Globe size={14} color="var(--blue)" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="language-dropdown"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-box">
            <Store size={28} color="#fff" />
          </div>
          <h1 className="login-shop-title">{shop.name}</h1>
          <p className="login-shop-subtitle">
            Retail POS, Billing & Khata Management System
          </p>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Username</span>
            <div className="input-with-icon">
              <UserCheck size={16} className="muted" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or cashier"
                autoFocus
              />
            </div>
          </label>

          <label className="field" style={{ marginTop: 8 }}>
            <span>Password</span>
            <div className="input-with-icon">
              <Lock size={16} className="muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </label>

          {error ? <div className="alert alert-error animate-shake">{error}</div> : null}

          <button type="submit" className="btn btn-primary btn-xl" style={{ marginTop: 14 }}>
            Sign In to Terminal
          </button>
        </form>

        <div className="login-divider">
          <span>OR 1-CLICK DEMO LOGIN</span>
        </div>

        {/* Quick 1-Click Role Login Buttons */}
        <div className="quick-roles-grid">
          <button
            type="button"
            className="role-login-card admin-role-card"
            onClick={() => quickLogin('admin')}
          >
            <div className="role-icon-pill admin-pill">
              <ShieldCheck size={18} />
            </div>
            <div className="role-text-meta">
              <strong>Admin (Store Owner)</strong>
              <small>Full access to POS, Reports, Khata & Settings</small>
            </div>
          </button>

          <button
            type="button"
            className="role-login-card subadmin-role-card"
            onClick={() => quickLogin('subadmin')}
          >
            <div className="role-icon-pill subadmin-pill">
              <Users size={18} />
            </div>
            <div className="role-text-meta">
              <strong>Sub-Admin (Cashier)</strong>
              <small>Fast POS billing, Khata credit & customer management</small>
            </div>
          </button>
        </div>

        <p className="tiny muted center" style={{ marginTop: 16 }}>
          Local Offline Demo · No server credentials required
        </p>
      </div>
    </div>
  );
}
