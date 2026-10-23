import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useStore } from '../context/StoreContext';

export default function AppLayout() {
  const { shop, resetDemo, toast, clearToast } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        shopName={shop.name}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="app-content">
        <Header
          shopName={shop.name}
          onReset={() => setResetOpen(true)}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="page">
          <Outlet />
        </main>
        <MobileBottomNav onOpenMenu={() => setMobileSidebarOpen(true)} />
      </div>
      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog
        open={resetOpen}
        title="Reset demo data?"
        message="This restores the original sample products, stock, and bills. Current demo changes in this browser will be removed."
        confirmLabel="Reset demo"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
