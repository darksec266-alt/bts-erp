"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import type { DamageLossReportDto, DamageLossDisposition } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface ApproveDamageLossModalProps {
  report: DamageLossReportDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: DamageLossReportDto) => void;
}

export const ApproveDamageLossModal: React.FC<ApproveDamageLossModalProps> = ({
  report,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [disposition, setDisposition] = useState<DamageLossDisposition>("SCRAP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !report) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Review Report: ${report.reportNumber}`}
        icon={CheckCircle2}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.approveDamageLossReport(report.id, { disposition });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve damage/loss report.");
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
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border bg-page-bg/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Approve Damage & Loss Report</h2>
              <p className="text-caption text-text-muted mt-0.5">{report.reportNumber}</p>
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

          {/* Report Summary */}
          <div className="p-4 bg-page-bg rounded-sm border border-border space-y-2 text-body">
            <div className="flex justify-between">
              <span className="text-text-muted">Warehouse:</span>
              <span className="font-semibold text-ink">{report.warehouse?.name || report.warehouseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Reason:</span>
              <span className="text-ink font-medium">{report.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Items Affected:</span>
              <span className="text-ink font-medium">{report.lines?.length || 0} line(s)</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Gross Loss:</span>
              <span className="font-bold text-danger font-mono">৳{Number(report.grossLoss || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3.5 bg-primary-tint border border-primary/20 rounded-sm flex items-start gap-2 text-ink text-caption">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Rule §33 (Enforced):</strong> The approving manager cannot be the person who reported this
              incident. Approving with SCRAP or WRITE_OFF will automatically write off inventory from the warehouse stock ledger.
            </span>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Select Final Disposition Action <span className="text-danger">*</span>
            </label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as DamageLossDisposition)}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              required
            >
              <option value="SCRAP">SCRAP (Deduct from inventory permanently)</option>
              <option value="WRITE_OFF">WRITE_OFF (Full financial write-off)</option>
              <option value="RETURN_TO_STOCK">RETURN_TO_STOCK (Item passed secondary inspection)</option>
              <option value="REPAIR">REPAIR (Send to field service technician for refurbish)</option>
              <option value="RMA">RMA (Return to supplier under warranty)</option>
            </select>
          </div>

          {/* Actions */}
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
              className="h-10 px-5 rounded-sm bg-primary text-surface text-body font-medium hover:bg-primary-hover flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Approving..." : "Confirm & Execute Disposition"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
