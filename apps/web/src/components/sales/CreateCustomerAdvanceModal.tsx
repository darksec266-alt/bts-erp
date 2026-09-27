"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownLeft, Loader2, AlertCircle, FileCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerDto, BranchDto, CustomerAdvanceDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateCustomerAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (advance: CustomerAdvanceDto) => void;
  customers: CustomerDto[];
  branches: BranchDto[];
  defaultCustomerId?: string;
  defaultBranchId?: string;
}

export const CreateCustomerAdvanceModal: React.FC<CreateCustomerAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  branches,
  defaultCustomerId = "",
  defaultBranchId = "",
}) => {
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [branchId, setBranchId] = useState(defaultBranchId || (branches[0]?.id ?? ""));
  const [projectRef, setProjectRef] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<"CASH" | "BANK" | "MOBILE_BANKING" | "CARD">("BANK");
  
  // Bank Proof fields (when method is BANK or CHEQUE)
  const [accountNumberLast4, setAccountNumberLast4] = useState("");
  const [proofFileId, setProofFileId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      if (!customerId && (defaultCustomerId || customers[0]?.id)) {
        setCustomerId(defaultCustomerId || customers[0].id);
      }
      if (!branchId && (defaultBranchId || branches[0]?.id)) {
        setBranchId(defaultBranchId || branches[0].id);
      }
      setError(null);
    }
  }, [isOpen, defaultCustomerId, defaultBranchId, customers, branches, customerId, branchId]);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="New Customer Advance"
        icon={ArrowDownLeft}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCustomerId = customerId || defaultCustomerId || customers[0]?.id;
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!effectiveCustomerId || !effectiveBranchId || !amount || Number(amount) <= 0) {
      setError("Please select a customer, branch, and specify a valid advance amount.");
      return;
    }

    if (method === "BANK" && accountNumberLast4 && accountNumberLast4.replace(/\D/g, "").length < 4) {
      setError("Please provide exactly the last 4 digits of the bank account number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bankProof =
        method === "BANK" && accountNumberLast4
          ? {
              accountNumberLast4: accountNumberLast4.replace(/\D/g, "").slice(-4),
              proofFileId: proofFileId || `proof_${Date.now()}`,
            }
          : undefined;

      const res = await api.createCustomerAdvance({
        customerId: effectiveCustomerId,
        branchId: effectiveBranchId,
        projectRef: projectRef.trim() || undefined,
        amount: Number(amount),
        receivedDate: new Date(receivedDate),
        method,
        bankProof,
      });

      onSuccess(res);
      onClose();
      // Reset state
      setAmount("");
      setProjectRef("");
      setAccountNumberLast4("");
      setProofFileId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record customer advance.");
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-success/10 text-success flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Record Customer Advance</h2>
              <p className="text-caption text-text-muted mt-0.5">Credit pre-payment or deposit against order/project</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Customer <span className="text-danger">*</span>
              </label>
              <select
                value={customerId || defaultCustomerId || (customers[0]?.id ?? "")}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.customerCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Branch <span className="text-danger">*</span>
              </label>
              <select
                value={branchId || defaultBranchId || (branches[0]?.id ?? "")}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Advance Amount (BDT) <span className="text-danger">*</span>
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
                Received Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Payment Method <span className="text-danger">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "CASH" | "BANK" | "MOBILE_BANKING" | "CARD")}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="BANK">Bank Transfer / Cheque</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_BANKING">Mobile Banking (bKash/Nagad)</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Project / Order Reference
              </label>
              <input
                type="text"
                placeholder="Optional (e.g. PRJ-2026-001)"
                value={projectRef}
                onChange={(e) => setProjectRef(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {method === "BANK" && (
            <div className="p-4 bg-page-bg rounded-sm border border-border space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium text-body">
                <FileCheck className="w-4 h-4" />
                <span>Bank Transaction Proof (Rule §25 Compliance)</span>
              </div>
              <p className="text-caption text-text-muted">
                Last 4 digits are stored for verification and reconciliation. Full account numbers are never stored.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Account Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5678"
                    value={accountNumberLast4}
                    onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-9 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Proof Reference / Slip No
                  </label>
                  <input
                    type="text"
                    placeholder="Slip / Txn Reference ID"
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
              <span>Record Advance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
