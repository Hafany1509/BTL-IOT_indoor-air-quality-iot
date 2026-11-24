import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <header className="modal-heading"><h2 id={id}>{title}</h2>
      <button className="icon-button" type="button" disabled={busy} aria-label="Đóng" onClick={onClose}><X size={20} /></button>
    </header>
    {children}
  </dialog>;
}
