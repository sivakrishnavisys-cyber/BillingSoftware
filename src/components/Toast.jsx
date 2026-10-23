import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'warning' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;
  return (
    <div className={`toast toast-${toast.type || 'success'}`} role="status">
      <Icon size={18} />
      <span>{toast.message}</span>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Dismiss message">
        <X size={16} />
      </button>
    </div>
  );
}
