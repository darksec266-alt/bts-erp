"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Clock, Calendar, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { SerialNumberDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface SerialHistoryDrawerProps {
  serial: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SerialHistoryDrawer: React.FC<SerialHistoryDrawerProps> = ({
  serial,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<SerialNumberDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (serial && isOpen) {
      setLoading(true);
      setError(null);
      api.getSerialHistory(serial)
        .then((res) => setData(res))
        .catch((err) => setError(err?.message || "Failed to load serial history"))
        .finally(() => setLoading(false));
    }
  }, [serial, isOpen]);

  if (!isOpen || !serial) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Serial #${serial}`}
        icon={QrCode}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case "RECEIVED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "IN_STOCK":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "RESERVED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "SOLD":
      case "INSTALLED":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "DAMAGED_WRITTEN_OFF":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div
        className={`bg-surface shadow-elevation-2 flex flex-col h-full border-l border-border transition-all duration-300 ${
          isMaximized ? "w-full" : "w-full max-w-xl"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">SKU Lifecycle Tracking</h2>
              <p className="text-caption text-text-muted mt-0.5">Serial: <span className="font-mono font-medium text-ink">{serial}</span></p>
            </div>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-body font-medium">Fetching lifecycle history...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-sm flex items-center gap-2 text-danger text-body">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Product Info Card */}
              <div className="p-4 bg-page-bg rounded-sm border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold uppercase text-text-muted">Item Details</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-caption font-semibold border ${getStageColor(data.currentStage)}`}>
                    {data.currentStage}
                  </span>
                </div>
                <div>
                  <h3 className="text-body font-bold text-ink">{data.product?.name}</h3>
                  <p className="text-caption text-text-muted mt-0.5">SKU: <span className="font-mono text-ink">{data.product?.sku}</span></p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-body font-semibold text-ink mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Audit Trail & Lifecycle History</span>
                </h4>

                {(!data.events || data.events.length === 0) ? (
                  <p className="text-body text-text-muted italic">No historical events recorded for this serial yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {data.events.map((ev, i) => (
                      <div key={ev.id || i} className="relative group">
                        <div className="absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-primary bg-surface" />
                        <div className="p-3 bg-page-bg/60 rounded-sm border border-border hover:border-primary/40 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStageColor(ev.eventType)}`}>
                              {ev.eventType}
                            </span>
                            <span className="text-caption text-text-muted flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(ev.occurredAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-caption text-text-muted">
                            Triggered by: <span className="font-medium text-ink">{ev.sourceModule}</span>
                            {ev.sourceId && <span className="ml-2 font-mono text-[11px]">[{ev.sourceId.substring(0, 10)}...]</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-page-bg/50">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
