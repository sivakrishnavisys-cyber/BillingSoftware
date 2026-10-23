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

  const value = useMemo(() => ({
    state,
    shop: state.shop,
    settings: state.settings,
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
    toast,
    showToast,
    clearToast: () => setToast(null),
  }), [state, update, resetDemo, toast, showToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
