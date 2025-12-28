"use client";

import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const styles = {
    success: "border-green-500/20 bg-green-500/10",
    error: "border-red-500/20 bg-red-500/10",
    info: "border-blue-500/20 bg-blue-500/10",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg animate-slide-in min-w-[300px] max-w-md",
        styles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="rounded p-1 hover:bg-accent transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

