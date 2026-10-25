import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { loadState, resetState, saveState } from '../services/storageService';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => loadState());
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    window.setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 3200);
  }, []);

  const update = useCallback((mutator) => {
    setState((prev) => {
      const next = typeof mutator === 'function' ? mutator(prev) : mutator;
      if (!next) {
        console.error('Store update mutator returned undefined or null. Keeping previous state.');
        return prev;
      }
      const { lastInvoice, invoice, state: _circ, createdProduct, createdCustomer, lastKhataTx, ...persistable } = next;
      try {
        saveState(persistable);
      } catch (err) {
        console.error('Failed to save state to localStorage:', err);
      }
      return next;
    });
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = resetState();
    setState(fresh);
    showToast('Demo data restored.', 'success');
  }, [showToast]);

  const setActiveBranch = useCallback((branchId) => {
    update((prev) => {
      const branch = (prev.branches || []).find((b) => b.id === branchId);
      const firstCounter = branch?.counters?.[0]?.id || 'CNT-01';
      return {
        ...prev,
        activeBranchId: branchId,
        activeCounterId: firstCounter,
      };
    });
  }, [update]);

  const setActiveCounter = useCallback((counterId) => {
    update((prev) => ({
      ...prev,
      activeCounterId: counterId,
    }));
  }, [update]);

  const addCategory = useCallback((name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');
    update((prev) => {
      const existing = prev.categories || [];
      if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`Category "${trimmed}" already exists.`);
      }
      return {
        ...prev,
        categories: [...existing, trimmed],
      };
    });
  }, [update]);

  const updateCategory = useCallback((oldName, newName) => {
    const trimmed = String(newName || '').trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');
    update((prev) => {
      const existing = prev.categories || [];
      const updatedCategories = existing.map((c) => (c === oldName ? trimmed : c));
      const updatedProducts = (prev.products || []).map((p) =>
        p.category === oldName ? { ...p, category: trimmed } : p
      );
      return {
        ...prev,
        categories: updatedCategories,
        products: updatedProducts,
      };
    });
  }, [update]);

  const deleteCategory = useCallback((name) => {
    update((prev) => {
      const existing = prev.categories || [];
      return {
        ...prev,
        categories: existing.filter((c) => c !== name),
      };
    });
  }, [update]);

  const value = useMemo(() => ({
    state,
    shop: state.shop,
    settings: state.settings,
    branches: state.branches || [],
    categories: state.categories || [],
    activeBranchId: state.activeBranchId || 'BR-001',
    activeCounterId: state.activeCounterId || 'CNT-01',
    products: state.products,
    invoices: state.invoices,
    movements: state.movements,
    customers: state.customers || [],
    khataTransactions: state.khataTransactions || [],
    suppliers: state.suppliers || [],
    purchases: state.purchases || [],
    purchaseReturns: state.purchaseReturns || [],
    supplierPayments: state.supplierPayments || [],
    staff: state.staff || [],
    heldBills: state.heldBills || [],
    update,
    resetDemo,
    setActiveBranch,
    setActiveCounter,
    addCategory,
    updateCategory,
    deleteCategory,
    toast,
    showToast,
    clearToast: () => setToast(null),
  }), [
    state,
    update,
    resetDemo,
    setActiveBranch,
    setActiveCounter,
    addCategory,
    updateCategory,
    deleteCategory,
    toast,
    showToast,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
