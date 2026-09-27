"use client";

import React, { useState, useEffect } from "react";
import { PackageCheck, Loader2, AlertCircle, Info } from "lucide-react";
import { api } from "../../lib/api";
import type { StockTransferDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface ReceiveStockTransferModalProps {
  transfer: StockTransferDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: StockTransferDto) => void;
}

export const ReceiveStockTransferModal: React.FC<ReceiveStockTransferModalProps> = ({
  transfer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [receivedQuantity, setReceivedQuantity] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (transfer) {
      setReceivedQuantity(transfer.quantity);
      setNotes("");
      setError(null);
    }
  }, [transfer]);

  if (!isOpen || !transfer) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Receive Transfer: ${transfer.product?.name || "Item"}`}
        icon={PackageCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const expectedQty = Number(transfer.quantity);
  const currentActualQty = receivedQuantity === "" ? 0 : Number(receivedQuantity);
  const isDiscrepant = currentActualQty !== expectedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receivedQuantity === "" || Number(receivedQuantity) < 0) {
      setError("Please specify a valid received quantity.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.receiveStockTransfer(transfer.id, {
        receivedQuantity: Number(receivedQuantity),
        notes: notes.trim(),
      });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept stock transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0"
            : "relative w-full max-w-md rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-success/10 text-success flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Receive Stock Transfer</h2>
              <p className="text-caption text-text-muted mt-0.5">Acknowledge physical arrival at destination warehouse</p>
            </div>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm flex items-center gap-2 text-danger text-body">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Summary Card */}
          <div className="p-4 bg-page-bg rounded-sm border border-border space-y-2 text-body">
            <div className="flex justify-between">
              <span className="text-text-muted">Product:</span>
              <span className="font-semibold text-ink">
                {transfer.product?.name} [{transfer.product?.sku}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">From:</span>
              <span className="text-ink font-medium">{transfer.fromWarehouse?.name || transfer.fromWarehouseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Destination:</span>
              <span className="text-ink font-medium">{transfer.toWarehouse?.name || transfer.toWarehouseId}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Dispatched Qty:</span>
              <span className="font-bold text-primary">{expectedQty} units</span>
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Actually Received Quantity <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {isDiscrepant && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-sm flex items-start gap-2 text-warning text-caption">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Received quantity ({currentActualQty}) differs from dispatched ({expectedQty}). This transfer will be
                logged with status <strong>DISCREPANT</strong> for inventory audit.
              </span>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Receipt Notes / Condition</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received in good condition, packages sealed"
              className="w-full p-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-sm bg-success hover:bg-success/90 text-surface text-body font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Receiving..." : "Confirm & Update Stock"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
