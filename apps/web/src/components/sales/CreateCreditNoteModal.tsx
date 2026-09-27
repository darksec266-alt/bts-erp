"use client";

import React, { useState } from "react";
import { FileMinus, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { InvoiceDto, CreditNoteDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (creditNote: CreditNoteDto) => void;
  invoices: InvoiceDto[];
  defaultInvoiceId?: string;
}

export const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoices,
  defaultInvoiceId = "",
}) => {
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || (invoices[0]?.id ?? ""));
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`New Credit Note - ${selectedInvoice?.invoiceNumber || "Invoice"}`}
        icon={FileMinus}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amount || Number(amount) <= 0 || !reason.trim()) {
      setError("Please select an invoice and provide a valid credit amount and reason.");
      return;
    }

    if (selectedInvoice && Number(amount) > selectedInvoice.grandTotal) {
      setError(`Credit note amount cannot exceed invoice total (${selectedInvoice.grandTotal.toLocaleString()} BDT).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createCreditNote({
        invoiceId,
        amount: Number(amount),
        reason: reason.trim(),
      });

      onSuccess(res);
      onClose();
      setAmount("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue credit note.");
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
            <div className="w-10 h-10 rounded-sm bg-danger/10 text-danger flex items-center justify-center font-bold">
              <FileMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Issue Credit Note</h2>
              <p className="text-caption text-text-muted mt-0.5">Issue offsetting credit against a posted invoice</p>
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

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Select Invoice <span className="text-danger">*</span>
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select an invoice...</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customer?.displayName} ({inv.grandTotal.toLocaleString()} BDT)
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3.5 bg-page-bg rounded-sm border border-border flex justify-between items-center text-body">
              <div>
                <span className="text-text-muted">Customer: </span>
                <span className="font-medium text-ink">{selectedInvoice.customer?.displayName}</span>
              </div>
              <div>
                <span className="text-text-muted">Invoice Total: </span>
                <span className="font-semibold text-ink font-mono">
                  {selectedInvoice.grandTotal.toLocaleString()} BDT
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Credit Amount (BDT) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Reason for Credit Note <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Returned goods from Delivery Challan / Price adjustment / Dispute settlement"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              disabled={loading}
              className="h-10 px-5 rounded-sm bg-danger text-surface text-body font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Issue Credit Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
