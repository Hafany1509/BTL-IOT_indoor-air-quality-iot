import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timer = useRef(null);
  const notify = useCallback(text => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ToastContext.Provider value={notify}>{children}
    {message && <div className="toast" role="status"><CheckCircle size={19} />{message}
      <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setMessage('')}><X size={17} /></button>
    </div>}
  </ToastContext.Provider>;
}
