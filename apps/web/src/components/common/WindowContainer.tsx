"use client";

import React from "react";
import { Minus, Maximize2, Minimize2, X } from "lucide-react";

export interface WindowHeaderActionsProps {
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const WindowHeaderActions: React.FC<WindowHeaderActionsProps> = ({
  isMaximized,
  onToggleMaximize,
  onMinimize,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* Minimize Button */}
      <button
        type="button"
        onClick={onMinimize}
        title="Minimize window"
        className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Maximize / Restore Button */}
      <button
        type="button"
        onClick={onToggleMaximize}
        title={isMaximized ? "Restore window size" : "Maximize window"}
        className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
      >
        {isMaximized ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </button>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        title="Close window"
        className="p-1.5 rounded-sm text-text-muted hover:text-danger hover:bg-page-bg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export interface WindowMinimizedPillProps {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  onRestore: () => void;
  onClose: () => void;
}

export const WindowMinimizedPill: React.FC<WindowMinimizedPillProps> = ({
  title,
  icon,
  onRestore,
  onClose,
}) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <span className="text-primary shrink-0 flex items-center">{icon}</span>;
    }
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-4 h-4 text-primary shrink-0" />;
    }
    return null;
  };

  return (
    <div className="fixed bottom-5 right-6 z-50 bg-surface border border-border rounded-md shadow-elevation-2 flex items-center gap-3 px-4 py-2.5 animate-in slide-in-from-bottom-2 text-ink max-w-sm">
      <div
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity truncate flex-1"
        onClick={onRestore}
        title="Click to restore window"
      >
        {renderIcon()}
        <span className="text-body font-semibold truncate">{title}</span>
        <span className="text-[10px] bg-primary-tint text-primary px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
          Minimized
        </span>
      </div>
      <div className="flex items-center gap-1 border-l border-border pl-2 shrink-0">
        <button
          type="button"
          onClick={onRestore}
          title="Restore window"
          className="p-1 hover:bg-page-bg rounded-sm text-text-muted hover:text-ink transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close window"
          className="p-1 hover:bg-page-bg rounded-sm text-text-muted hover:text-danger transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
