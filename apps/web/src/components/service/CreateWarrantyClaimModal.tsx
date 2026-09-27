"use client";

import React, { useState } from "react";
import { ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { WarrantyClaimDto, WarrantyDto, TicketDto, WarrantyClaimOutcome } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateWarrantyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (claim: WarrantyClaimDto) => void;
  warranties: WarrantyDto[];
  tickets: TicketDto[];
}

export const CreateWarrantyClaimModal: React.FC<CreateWarrantyClaimModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warranties,
  tickets,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [warrantyId, setWarrantyId] = useState(warranties[0]?.id || "");
  const [ticketId, setTicketId] = useState(tickets[0]?.id || "");
  const [outcome, setOutcome] = useState<WarrantyClaimOutcome>("REPAIRED");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="File Warranty Claim"
        icon={ShieldAlert}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyId || !ticketId) {
      setError("Please select both a registered warranty and an open ticket.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const claim = await api.createWarrantyClaim({
        warrantyId,
        ticketId,
        outcome,
      });
      onSuccess(claim);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to file warranty claim");
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
            : "relative w-full max-w-lg rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">File Warranty Claim</h2>
              <p className="text-caption text-text-muted">
                Link equipment warranty to customer service ticket
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Active Warranty / Asset Serial <span className="text-danger">*</span>
            </label>
            <select
              value={warrantyId}
              onChange={(e) => setWarrantyId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select registered warranty</option>
              {warranties.map((w) => (
                <option key={w.id} value={w.id}>
                  SN: {w.serialNumber?.serialNumber || w.serialNumberId} ({w.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Service Ticket <span className="text-danger">*</span>
            </label>
            <select
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select ticket</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticketNumber} - {t.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">Claim Settlement Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as WarrantyClaimOutcome)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="REPAIRED">Repaired</option>
              <option value="REPLACED">Replaced</option>
              <option value="REJECTED">Rejected</option>
            </select>
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
              disabled={loading || !warrantyId || !ticketId}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-warning text-white hover:bg-warning-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>File Claim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
