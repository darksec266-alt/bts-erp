"use client";

import React, { useState } from "react";
import { PackageCheck, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { ProductCustodyDto, ServiceAssignmentDto, ProductDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface IssueProductCustodyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (custody: ProductCustodyDto) => void;
  assignment: ServiceAssignmentDto | null;
  products: ProductDto[];
  employees: { id: string; employeeCode: string; firstName?: string; lastName?: string; fullName?: string }[];
}

export const IssueProductCustodyModal: React.FC<IssueProductCustodyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  products,
  employees,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [custodianEmployeeId, setCustodianEmployeeId] = useState(
    assignment?.technicians?.[0]?.employeeId || employees[0]?.id || ""
  );
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [serialNumberId, setSerialNumberId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Issue Custody - ${assignment.assignmentNumber}`}
        icon={PackageCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodianEmployeeId || !productId || quantity <= 0) {
      setError("Please fill in all mandatory fields with valid values.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const custody = await api.issueProductCustody({
        assignmentId: assignment.id,
        custodianId: custodianEmployeeId,
        productId,
        serialNumberId: serialNumberId.trim() || undefined,
        quantity,
      });
      onSuccess(custody);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to issue product custody");
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
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Issue Product Custody</h2>
              <p className="text-caption text-text-muted">
                Transfer physical equipment/parts to technician custody for{" "}
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
              Custodian (Technician) <span className="text-danger">*</span>
            </label>
            <select
              value={custodianEmployeeId}
              onChange={(e) => setCustodianEmployeeId(e.target.value)}
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

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Product / Item <span className="text-danger">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Serial # / Asset Tag
              </label>
              <input
                type="text"
                value={serialNumberId}
                onChange={(e) => setSerialNumberId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono"
                placeholder="SN-XXXXX (if tracked)"
              />
            </div>
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Quantity <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                required
              />
            </div>
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
              disabled={loading || !productId || !custodianEmployeeId}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Issue Custody</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
