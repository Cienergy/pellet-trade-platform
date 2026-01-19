import { useEffect, useState } from "react";

let toastId = 0;
const listeners = new Set();

export function showToast(message, type = "info", duration = 5000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  
  listeners.forEach((listener) => listener(toast));
  
  if (duration > 0) {
    setTimeout(() => {
      listeners.forEach((listener) => listener({ ...toast, remove: true }));
    }, duration);
  }
  
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      if (toast.remove) {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      } else {
        setToasts((prev) => [...prev.filter((t) => t.id !== toast.id), toast]);
      }
    };

    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return toasts;
}

export default function ToastContainer() {
  const toasts = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            min-w-[300px] max-w-md px-6 py-4 rounded-xl shadow-2xl
            backdrop-blur-md border transform transition-all duration-300
            animate-in slide-in-from-right fade-in
            ${
              toast.type === "success"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-900"
                : toast.type === "error"
                ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-900"
                : toast.type === "warning"
                ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900"
                : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-900"
            }
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" && (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "warning" && (
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => {
                listeners.forEach((listener) => listener({ ...toast, remove: true }));
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

