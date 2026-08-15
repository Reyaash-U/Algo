import { createContext, useCallback, useContext, useState } from 'react';

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
              ? 'border-l-4 border-l-rose-500'
              : t.type === 'success'
              ? 'border-l-4 border-l-emerald-500'
              : 'border-l-4 border-l-violet-500';

          return (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/10 text-sm text-gray-100 shadow-2xl animate-slide-in ${borderClass}`}
            >
              <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
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
