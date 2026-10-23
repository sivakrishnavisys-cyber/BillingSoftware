import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function PrintStage({ open, title, onClose, children, extraClass = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('printing-active');
    return () => document.body.classList.remove('printing-active');
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`print-stage ${extraClass}`}>
      <div className="print-toolbar no-print">
        <h3>{title}</h3>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <div className="print-sheet">{children}</div>
    </div>,
    document.body,
  );
}
