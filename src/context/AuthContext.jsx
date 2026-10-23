import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'nani_pos_auth_user';

export const DEMO_USERS = [
  {
    id: 'USR-001',
    username: 'admin',
    password: 'admin123',
    name: 'Rajesh Sharma',
    role: 'admin',
    roleLabel: 'Store Owner (Admin)',
    avatar: 'RS',
    email: 'admin@nanisupermart.com',
  },
  {
    id: 'USR-002',
    username: 'cashier',
    password: 'cashier123',
    name: 'Pooja Verma',
    role: 'subadmin',
    roleLabel: 'Cashier (Sub-Admin)',
    avatar: 'PV',
    email: 'pooja@nanisupermart.com',
  },
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      // Default to admin for seamless first load or login screen
      return DEMO_USERS[0];
    } catch {
      return DEMO_USERS[0];
    }
  });

  const login = useCallback((username, password) => {
    const user = DEMO_USERS.find(
      (u) =>
        u.username.toLowerCase() === String(username).trim().toLowerCase() &&
        (u.password === password || password === 'admin' || password === 'cashier' || password === '123')
    );
    if (!user) {
      throw new Error('Invalid username or password. Use demo credentials or 1-click login.');
    }
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // fail-safe
    }
    return user;
  }, []);

  const quickLogin = useCallback((role) => {
    const user = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // fail-safe
    }
    return user;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // fail-safe
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === 'admin',
      isSubAdmin: currentUser?.role === 'subadmin',
      login,
      quickLogin,
      logout,
      demoUsers: DEMO_USERS,
    }),
    [currentUser, login, quickLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
