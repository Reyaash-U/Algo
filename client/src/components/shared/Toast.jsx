import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

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
      <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-50" aria-live="polite">
        {toasts.map((t) => {
          const borderClass =
            t.type === 'error'
              ? 'border-l-4 border-l-red-500'
              : t.type === 'success'
              ? 'border-l-4 border-l-zinc-950 dark:border-l-white'
              : 'border-l-4 border-l-zinc-500';

          return (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border shadow-2xl animate-slide-in ${borderClass}`}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <span className="flex items-center">
                {t.type === 'success' ? <CheckCircle2 size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
              </span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
