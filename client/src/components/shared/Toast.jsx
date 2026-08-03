import { createContext, useCallback, useContext, useState } from 'react';

// Minimal toast system. ToastProvider goes near the app root; call useToast()
// anywhere to push a message. No external dep — swap for a library later if
// the team wants richer animations.

const ToastContext = createContext(null);
let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, { type = 'info', ttl = 4000 } = {}) => {
    const id = idSeq++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="av-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`av-toast av-toast--${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
