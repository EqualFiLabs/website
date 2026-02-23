"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";

const ToastContext = createContext({
  addToast: () => {},
  removeToast: () => {},
});

const toastIcons = {
  pending: "⏳",
  success: "✅",
  error: "⚠️",
};

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "pending", link }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, title, description, type, link }]);
      setTimeout(() => removeToast(id), 5000);
      return id;
    },
    [removeToast]
  );

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-spacing16 right-spacing16 z-40 flex w-full max-w-sm flex-col gap-spacing8">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-2xl border px-spacing12 py-spacing10 shadow-card backdrop-blur",
              "bg-surface2 text-neutral1",
              toast.type === "success"
                ? "border-accent1"
                : toast.type === "error"
                  ? "border-statusCritical"
                  : "border-surface3",
            ].join(" ")}
          >
            <div className="flex items-start gap-spacing8">
              <div className="text-lg">{toastIcons[toast.type] || "ℹ️"}</div>
              <div className="flex-1 space-y-spacing4">
                <div className="text-sm font-semibold">{toast.title}</div>
                {toast.description ? (
                  <div className="text-xs text-neutral2 break-all">{toast.description}</div>
                ) : null}
                {toast.link ? (
                  <a
                    href={toast.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent1 hover:text-accent1Hovered"
                  >
                    View on explorer
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-neutral3 transition-colors hover:text-neutral1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToasts = () => useContext(ToastContext);

export default ToastProvider;
