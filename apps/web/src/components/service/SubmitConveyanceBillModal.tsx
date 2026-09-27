"use client";

import React, { useState } from "react";
import { Receipt, AlertCircle, Loader2, Link2 } from "lucide-react";
import { api } from "../../lib/api";
import type { ConveyanceBillDto, ServiceAssignmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface SubmitConveyanceBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bill: ConveyanceBillDto) => void;
  assignment: ServiceAssignmentDto | null;
  employees: { id: string; employeeCode: string; firstName?: string; lastName?: string; fullName?: string }[];
}

export const SubmitConveyanceBillModal: React.FC<SubmitConveyanceBillModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  employees,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [employeeId, setEmployeeId] = useState(
    assignment?.technicians?.[0]?.employeeId || employees[0]?.id || ""
  );
  const [totalClaimed, setTotalClaimed] = useState<number>(450);
  const [receiptFileId, setReceiptFileId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Conveyance Bill - ${assignment.assignmentNumber}`}
        icon={Receipt}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || totalClaimed <= 0) {
      setError("Please select an employee and enter a valid claimed amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bill = await api.submitConveyanceBill({
        assignmentId: assignment.id,
        employeeId,
        totalClaimed: Number(totalClaimed),
        receiptFileId: receiptFileId.trim() || undefined,
      });
      onSuccess(bill);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to submit conveyance bill");
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
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Submit Conveyance Bill</h2>
              <p className="text-caption text-text-muted">
                File travel and out-of-pocket expenses for assignment{" "}
                <span className="font-mono font-semibold text-primary">{assignment.assignmentNumber}</span>
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
              Claimant Technician <span className="text-danger">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select claimant</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Total Claimed Amount (BDT) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="5"
              value={totalClaimed}
              onChange={(e) => setTotalClaimed(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary focus:bg-surface outline-none text-h3"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Receipt / Voucher Document File ID / URL
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                value={receiptFileId}
                onChange={(e) => setReceiptFileId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono text-caption"
                placeholder="FILE-REC-XXXX or document reference"
              />
            </div>
          </div>

          <div className="p-3 bg-page-bg/40 border border-border rounded-sm text-caption text-text-muted">
            <span className="font-semibold text-ink">Four-Eyes Policy:</span> Conveyance bills cannot be
            approved by the claimant themselves. Another authorized supervisor must verify and approve this claim.
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
              disabled={loading || !employeeId || totalClaimed <= 0}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Claim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
