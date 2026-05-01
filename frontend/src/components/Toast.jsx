import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle } from "lucide-react";

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = "error" }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const handler = (e) => toast({ message: e.detail });
    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(t => (
            <div key={t.id}
              className="flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl pointer-events-auto"
              style={{
                background: "oklch(var(--text))",
                color: "oklch(var(--canvas))",
                animation: "slideUp 0.25s ease",
              }}>
              {React.createElement(t.type === "success" ? CheckCircle : AlertCircle, {
                className: "w-4 h-4 flex-shrink-0 mt-0.5",
                style: { color: t.type === "success" ? "oklch(var(--accent))" : "oklch(var(--primary))" }
              })}
              <p className="mc-body text-sm flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="opacity-40 hover:opacity-100 transition-opacity">
                {React.createElement(X, { className: "w-3.5 h-3.5" })}
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
