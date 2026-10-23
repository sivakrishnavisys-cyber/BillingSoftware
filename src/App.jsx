import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Khata from './pages/Khata';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Staff from './pages/Staff';
import BarcodeGenerator from './pages/BarcodeGenerator';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/khata" element={<Khata />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/barcodes" element={<BarcodeGenerator />} />
        <Route path="/sales" element={<SalesHistory />} />
        <Route path="/reports" element={isAdmin ? <Reports /> : <Navigate to="/pos" replace />} />
        <Route path="/settings" element={isAdmin ? <Settings /> : <Navigate to="/pos" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
