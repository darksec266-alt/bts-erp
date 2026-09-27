"use client";

import React, { useState, useEffect } from "react";
import { Calendar, AlertCircle, Loader2, Info } from "lucide-react";
import { api } from "../../lib/api";
import type { ServiceAssignmentDto, BranchDto, TicketDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateServiceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assignment: ServiceAssignmentDto) => void;
  branches: BranchDto[];
  tickets: TicketDto[];
  defaultBranchId?: string;
  defaultTicketId?: string;
}

export const CreateServiceAssignmentModal: React.FC<CreateServiceAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  tickets,
  defaultBranchId,
  defaultTicketId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [sourceType, setSourceType] = useState<"TICKET" | "SALES_ORDER" | "INVOICE">("TICKET");
  const [sourceId, setSourceId] = useState(defaultTicketId || tickets[0]?.id || "");
  const [manualSourceId, setManualSourceId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultBranchId) {
        setBranchId(defaultBranchId);
      } else if (branches.length > 0 && (!branchId || !branches.some((b) => b.id === branchId))) {
        setBranchId(branches[0].id);
      }
      if (defaultTicketId) {
        setSourceId(defaultTicketId);
      } else if (tickets.length > 0 && (!sourceId || !tickets.some((t) => t.id === sourceId))) {
        setSourceId(tickets[0].id);
      }
      setError(null);
    }
  }, [isOpen, defaultBranchId, branches, branchId, defaultTicketId, tickets, sourceId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Dispatch Service Assignment"
        icon={Calendar}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const selectedTicket = sourceType === "TICKET" ? tickets.find((t) => t.id === sourceId) : null;
  const isPaidTicket = selectedTicket?.ticketType === "PAID_SERVICE_REQUEST";
  const quotationAccepted = selectedTicket?.serviceQuotation?.status === "ACCEPTED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSourceId = sourceType === "TICKET" ? sourceId : manualSourceId.trim();
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!finalSourceId) {
      setError(`Please select or specify a valid ${sourceType} reference ID.`);
      return;
    }

    if (!effectiveBranchId) {
      setError("Please select a branch.");
      return;
    }

    if (sourceType === "TICKET" && isPaidTicket && !quotationAccepted) {
      setError(
        "Cannot create assignment: This is a Paid Service Request requiring an ACCEPTED quotation before dispatch."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assignment = await api.createServiceAssignment({
        branchId: effectiveBranchId,
        sourceType,
        sourceId: finalSourceId,
      });
      onSuccess(assignment);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create service assignment");
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
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Create Service Assignment</h2>
              <p className="text-caption text-text-muted">
                Schedule a fieldwork order from a ticket, order, or invoice.
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

          {/* Source Type Selector */}
          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Service Trigger Source <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["TICKET", "SALES_ORDER", "INVOICE"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSourceType(st)}
                  className={`py-2 px-3 text-caption font-semibold rounded-sm border text-center transition-colors ${
                    sourceType === st
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-page-bg text-ink hover:border-border-hover"
                  }`}
                >
                  {st === "TICKET" ? "Ticket Support" : st === "SALES_ORDER" ? "Sales Order" : "Invoice"}
                </button>
              ))}
            </div>
          </div>

          {/* Source Identification */}
          {sourceType === "TICKET" ? (
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Select Service Ticket <span className="text-danger">*</span>
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                required
              >
                <option value="">Select ticket</option>
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticketNumber} - {t.description} ({t.ticketType})
                  </option>
                ))}
              </select>

              {/* Informative Guard Badge */}
              {isPaidTicket && (
                <div
                  className={`mt-2 p-2.5 rounded-sm border text-caption flex items-start gap-2 ${
                    quotationAccepted
                      ? "bg-success-tint border-success/30 text-success"
                      : "bg-warning-tint border-warning/30 text-warning"
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Paid Service Request Gate: </span>
                    {quotationAccepted
                      ? "Service quotation is ACCEPTED. Assignment dispatch authorized."
                      : selectedTicket?.serviceQuotation
                      ? `Quotation status is "${selectedTicket.serviceQuotation.status}". Must be ACCEPTED by customer before dispatch.`
                      : "No service quotation created yet. Create and accept a quotation first."}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                {sourceType} ID / Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={manualSourceId}
                onChange={(e) => setManualSourceId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono"
                placeholder={`Enter UUID or ${sourceType} reference`}
                required
              />
            </div>
          )}

          {/* Branch */}
          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Operating Branch <span className="text-danger">*</span>
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
              disabled={loading || (sourceType === "TICKET" && isPaidTicket && !quotationAccepted)}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
