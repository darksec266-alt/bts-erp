"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, AlertCircle, FileCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { InvoiceDto, PaymentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: PaymentDto) => void;
  invoices: InvoiceDto[];
  defaultInvoiceId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoices,
  defaultInvoiceId = "",
}) => {
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || (invoices[0]?.id ?? ""));
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<"CASH" | "BANK" | "SSLCOMMERZ" | "CHEQUE">("BANK");
  const [gatewayTxnId, setGatewayTxnId] = useState("");

  // Bank Proof fields
  const [accountNumberLast4, setAccountNumberLast4] = useState("");
  const [proofFileId, setProofFileId] = useState("");

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
        title={`Record Payment - ${selectedInvoice?.invoiceNumber || "Invoice"}`}
        icon={CreditCard}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amount || Number(amount) <= 0) {
      setError("Please select an invoice and provide a valid payment amount.");
      return;
    }

    if ((method === "BANK" || method === "CHEQUE") && accountNumberLast4 && accountNumberLast4.replace(/\D/g, "").length < 4) {
      setError("Please provide exactly the last 4 digits of the account number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bankProof =
        (method === "BANK" || method === "CHEQUE") && accountNumberLast4
          ? {
              accountNumberLast4: accountNumberLast4.replace(/\D/g, "").slice(-4),
              proofFileId: proofFileId || `slip_${Date.now()}`,
            }
          : undefined;

      const res = await api.recordPayment({
        invoiceId,
        amount: Number(amount),
        method,
        gatewayTransactionId: gatewayTxnId.trim() || undefined,
        bankProof,
      });

      onSuccess(res);
      onClose();
      setAmount("");
      setGatewayTxnId("");
      setAccountNumberLast4("");
      setProofFileId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
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
            : "relative w-full max-w-lg rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-success/10 text-success flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Record Payment & Collection</h2>
              <p className="text-caption text-text-muted mt-0.5">Settle invoice receivables with multi-channel payment</p>
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
              onChange={(e) => {
                setInvoiceId(e.target.value);
                const inv = invoices.find((i) => i.id === e.target.value);
                if (inv) {
                  const paid = (inv.payments || []).reduce((acc, p) => acc + p.amount, 0);
                  const remaining = Math.max(0, inv.grandTotal - paid);
                  setAmount(remaining);
                }
              }}
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
                <span className="text-text-muted">Total: </span>
                <span className="font-semibold text-success font-mono">
                  {selectedInvoice.grandTotal.toLocaleString()} BDT
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Amount (BDT) <span className="text-danger">*</span>
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
                Payment Method <span className="text-danger">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "CASH" | "BANK" | "SSLCOMMERZ" | "CHEQUE")}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="SSLCOMMERZ">Online / SSLCOMMERZ</option>
              </select>
            </div>
          </div>

          {method === "SSLCOMMERZ" && (
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Gateway Transaction ID
              </label>
              <input
                type="text"
                placeholder="SSL transaction ID / Bank reference"
                value={gatewayTxnId}
                onChange={(e) => setGatewayTxnId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}

          {(method === "BANK" || method === "CHEQUE") && (
            <div className="p-4 bg-page-bg rounded-sm border border-border space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium text-body">
                <FileCheck className="w-4 h-4" />
                <span>Bank Transaction Proof (Rule §25 Compliance)</span>
              </div>
              <p className="text-caption text-text-muted">
                Rule §25 requires attaching transaction proof for any bank/cheque settlement. Only last 4 digits are stored.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Account Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={accountNumberLast4}
                    onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-9 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Proof Slip Ref / Deposit ID
                  </label>
                  <input
                    type="text"
                    placeholder="Cheque # / Slip Ref"
                    value={proofFileId}
                    onChange={(e) => setProofFileId(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

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
              className="h-10 px-5 rounded-sm bg-primary text-surface text-body font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Post Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
