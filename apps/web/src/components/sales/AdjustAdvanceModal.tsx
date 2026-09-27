"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerAdvanceDto, InvoiceDto, AdvanceAdjustmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface AdjustAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adjustment: AdvanceAdjustmentDto) => void;
  advance: CustomerAdvanceDto | null;
  invoices: InvoiceDto[];
}

export const AdjustAdvanceModal: React.FC<AdjustAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  advance,
  invoices,
}) => {
  const [invoiceId, setInvoiceId] = useState("");
  const [amountAdjusted, setAmountAdjusted] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !advance) return null;

  const maxAdjustable = advance.remainingAmount ?? (advance.amount - (advance.adjustedAmount ?? 0));

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Adjust Advance - ${advance.customer?.displayName || "Customer"}`}
        icon={SlidersHorizontal}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  // Filter invoices for this customer that are not CANCELLED
  const customerInvoices = invoices.filter(
    (inv) => inv.customerId === advance.customerId && inv.status !== "CANCELLED"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amountAdjusted || Number(amountAdjusted) <= 0) {
      setError("Please select an invoice and enter a valid adjustment amount.");
      return;
    }

    if (Number(amountAdjusted) > maxAdjustable) {
      setError(`Cannot adjust more than remaining advance balance (${maxAdjustable.toLocaleString()} BDT).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.adjustCustomerAdvance(advance.id, {
        advanceId: advance.id,
        invoiceId,
        amountAdjusted: Number(amountAdjusted),
      });

      onSuccess(res);
      onClose();
      setAmountAdjusted("");
      setInvoiceId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust advance against invoice.");
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
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "relative w-full max-w-md rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Adjust Advance</h2>
              <p className="text-caption text-text-muted mt-0.5">Apply advance credit against customer invoice</p>
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
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Advance summary card */}
          <div className="p-4 bg-page-bg rounded-sm border border-border space-y-2 text-body">
            <div className="flex justify-between">
              <span className="text-text-muted">Customer:</span>
              <span className="font-medium text-ink">{advance.customer?.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Advance:</span>
              <span className="font-semibold text-ink font-mono">{advance.amount.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between text-success font-medium">
              <span>Remaining Balance:</span>
              <span className="font-mono">{maxAdjustable.toLocaleString()} BDT</span>
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Select Invoice to Settle <span className="text-danger">*</span>
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select an invoice...</option>
              {customerInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.grandTotal.toLocaleString()} BDT ({inv.status})
                </option>
              ))}
            </select>
            {customerInvoices.length === 0 && (
              <p className="text-caption text-warning mt-1">
                No open invoices found for this customer.
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-caption font-medium text-text-muted">
                Adjustment Amount (BDT) <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmountAdjusted(maxAdjustable)}
                className="text-caption text-primary hover:underline font-medium font-mono"
              >
                Use Full ({maxAdjustable.toLocaleString()})
              </button>
            </div>
            <input
              type="number"
              min="0.01"
              max={maxAdjustable}
              step="0.01"
              placeholder="0.00"
              value={amountAdjusted}
              onChange={(e) => setAmountAdjusted(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              required
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || customerInvoices.length === 0}
              className="h-10 px-5 rounded-sm bg-primary text-surface text-body font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
