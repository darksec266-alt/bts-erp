"use client";

import React, { useState } from "react";
import { UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { ServiceAssignmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ServiceAssignmentDto) => void;
  assignment: ServiceAssignmentDto | null;
  employees: { id: string; employeeCode: string; firstName?: string; lastName?: string; fullName?: string }[];
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  employees,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Assign Technician - ${assignment.assignmentNumber}`}
        icon={UserCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError("Please select an employee technician.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await api.assignTechnician(assignment.id, employeeId);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to assign technician");
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
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Assign Field Technician</h2>
              <p className="text-caption text-text-muted">
                Dispatch an engineer to assignment{" "}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Select Technician (Employee) <span className="text-danger">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select technician</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-page-bg/40 border border-border rounded-sm text-caption text-text-muted space-y-1">
            <p>
              • Assigning a technician logs an audit event and links the technician to the assignment.
            </p>
            <p>• The technician will be able to perform GPS visits and submit conveyance bills.</p>
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
              disabled={loading || !employeeId}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
