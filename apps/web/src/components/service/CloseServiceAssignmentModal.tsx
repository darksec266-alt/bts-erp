"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, FileCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { ProjectClosureReportDto, ServiceAssignmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CloseServiceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: ProjectClosureReportDto) => void;
  assignment: ServiceAssignmentDto | null;
}

export const CloseServiceAssignmentModal: React.FC<CloseServiceAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [customerSignatureFileId, setCustomerSignatureFileId] = useState("");
  const [workSummary, setWorkSummary] = useState(
    "All service objectives successfully completed, tested, and verified operating in normal parameters."
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Close Project - ${assignment.assignmentNumber}`}
        icon={CheckCircle2}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      setError("Please provide the completion work summary.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.closeServiceAssignment({
        assignmentId: assignment.id,
        customerSignatureFileId: customerSignatureFileId.trim() || undefined,
        notes: workSummary.trim(),
      });
      onSuccess(res.closure);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to finalize project closure");
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
            : "relative w-full max-w-xl rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-success-tint text-success flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Project Closure & Customer Sign-Off</h2>
              <p className="text-caption text-text-muted">
                Finalize assignment{" "}
                <span className="font-mono font-semibold text-primary">{assignment.assignmentNumber}</span> and
                close ticket
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
              Customer Sign-Off Document / File ID
            </label>
            <input
              type="text"
              value={customerSignatureFileId}
              onChange={(e) => setCustomerSignatureFileId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono"
              placeholder="e.g. SIG-FILE-2026-001 (optional upload reference)"
            />
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Comprehensive Work Summary & Resolution Notes <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none resize-none"
              required
            />
          </div>

          <div className="p-3 bg-success-tint/30 border border-success/30 rounded-sm text-caption text-ink">
            <span className="font-semibold text-success">Automated Ticket Resolution:</span> Submitting
            this closure report will set assignment status to{" "}
            <span className="font-mono font-semibold text-ink">CLOSED</span> and automatically mark any
            underlying customer ticket as <span className="font-mono font-semibold text-ink">CLOSED</span>.
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
              disabled={loading || !workSummary.trim()}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-success text-white hover:bg-success-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign Off & Close Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
