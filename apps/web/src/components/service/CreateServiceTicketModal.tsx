"use client";

import React, { useState, useEffect } from "react";
import { Wrench, AlertCircle, Loader2, ShieldCheck, DollarSign } from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerDto, BranchDto, TicketDto, TicketType } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateServiceTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: TicketDto) => void;
  branches: BranchDto[];
  customers: CustomerDto[];
  defaultBranchId?: string;
}

export const CreateServiceTicketModal: React.FC<CreateServiceTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  customers,
  defaultBranchId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [ticketType, setTicketType] = useState<TicketType>("PAID_SERVICE_REQUEST");
  const [description, setDescription] = useState("");
  const [serialNumberId, setSerialNumberId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultBranchId) {
        setBranchId(defaultBranchId);
      } else if (branches.length > 0 && (!branchId || !branches.some((b) => b.id === branchId))) {
        setBranchId(branches[0].id);
      }
      if (customers.length > 0 && (!customerId || !customers.some((c) => c.id === customerId))) {
        setCustomerId(customers[0].id);
      }
      setError(null);
    }
  }, [isOpen, defaultBranchId, branches, branchId, customers, customerId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Create Service Ticket"
        icon={Wrench}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCustomerId = customerId || customers[0]?.id;
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!effectiveCustomerId) {
      setError("Please select a customer account.");
      return;
    }
    if (!effectiveBranchId) {
      setError("Please select a branch.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a detailed issue description.");
      return;
    }
    if (ticketType === "WARRANTY_CLAIM" && !serialNumberId.trim()) {
      setError("Serial Number / Asset Tag is required for Warranty Claim tickets.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ticket = await api.createTicket({
        branchId: effectiveBranchId,
        customerId: effectiveCustomerId,
        ticketType,
        description: description.trim(),
        serialNumberId: serialNumberId.trim() || undefined,
      });
      onSuccess(ticket);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create service ticket");
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
            : "relative w-full max-w-2xl rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Create Service Ticket</h2>
              <p className="text-caption text-text-muted">
                Log a customer service request, fault report, or warranty claim.
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ticket Type Selector */}
          <div>
            <label className="block text-caption font-semibold text-ink mb-2">
              Ticket Service Category <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTicketType("PAID_SERVICE_REQUEST")}
                className={`p-3.5 rounded-sm border text-left flex items-start gap-3 transition-colors ${
                  ticketType === "PAID_SERVICE_REQUEST"
                    ? "border-primary bg-primary-tint/20 text-primary"
                    : "border-border bg-page-bg/30 text-text-muted hover:border-border-hover"
                }`}
              >
                <DollarSign className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="text-body font-semibold">Paid Service Request</div>
                  <div className="text-caption opacity-80">
                    Billable repair or maintenance requiring quotation acceptance.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTicketType("WARRANTY_CLAIM")}
                className={`p-3.5 rounded-sm border text-left flex items-start gap-3 transition-colors ${
                  ticketType === "WARRANTY_CLAIM"
                    ? "border-primary bg-primary-tint/20 text-primary"
                    : "border-border bg-page-bg/30 text-text-muted hover:border-border-hover"
                }`}
              >
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="text-body font-semibold">Warranty Claim</div>
                  <div className="text-caption opacity-80">
                    Complimentary repair/replacement for active covered serial numbers.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Customer Account <span className="text-danger">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.customerCode}) {c.isServiceOnly ? "[Service-Only]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Branch <span className="text-danger">*</span>
              </label>
              <select
                value={branchId || defaultBranchId || (branches[0]?.id ?? "")}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                required
              >
                {branches.length === 0 && (
                  <option value="">No branch available</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Equipment Serial / Asset # {ticketType === "WARRANTY_CLAIM" && <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              value={serialNumberId}
              onChange={(e) => setSerialNumberId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono"
              placeholder="e.g. SN-88392-X or Product Serial ID"
              required={ticketType === "WARRANTY_CLAIM"}
            />
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Detailed Issue Description <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none resize-none"
              placeholder="Describe symptoms, error codes, site operating environment, and customer reported timeline..."
              required
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body rounded-sm border border-border text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
