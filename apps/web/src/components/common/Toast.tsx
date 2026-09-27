"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyles = {
    success: "bg-white border-success/30 text-ink shadow-elevation-2",
    error: "bg-white border-danger/30 text-ink shadow-elevation-2",
    info: "bg-white border-primary/30 text-ink shadow-elevation-2",
  }[toast.type];

  const iconStyles = {
    success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    info: <Info className="w-5 h-5 text-primary shrink-0" />,
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-4 rounded-md border ${bgStyles} transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-center gap-3">
        {iconStyles}
        <p className="text-body font-medium">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-muted hover:text-ink p-1 rounded-sm transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
