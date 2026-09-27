"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import type { PurchaseRequestDto, ProductDto, BranchDto } from "@bts/shared-types";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreatePurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pr: PurchaseRequestDto) => void;
  products: ProductDto[];
  branches: BranchDto[];
}

interface RequestLineForm {
  productId: string;
  quantity: number;
  notes: string;
}

export const CreatePurchaseRequestModal: React.FC<CreatePurchaseRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  branches,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [requestNumber, setRequestNumber] = useState(
    `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [lines, setLines] = useState<RequestLineForm[]>([
    { productId: products[0]?.id || "", quantity: 1, notes: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = api.getUser();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.permissions?.includes("*");

  useEffect(() => {
    if (isOpen) {
      if (branches.length > 0 && (!branchId || !branches.some((b) => b.id === branchId))) {
        setBranchId(branches[0].id);
      }
      if (products.length > 0 && lines.length === 1 && !lines[0].productId) {
        setLines([{ productId: products[0].id, quantity: 1, notes: "" }]);
      }
      setError(null);
    }
  }, [isOpen, branches, branchId, products, lines]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { productId: products[0]?.id || "", quantity: 1, notes: "" },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof RequestLineForm,
    value: string | number
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBranchId = branchId || branches[0]?.id;
    if (!effectiveBranchId) {
      setError("Please select an operating Branch.");
      return;
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0)) {
      setError("All lines must have a selected product and quantity > 0.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await api.createPurchaseRequest({
        requestNumber: requestNumber.trim(),
        branchId: effectiveBranchId,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          notes: l.notes.trim() || undefined,
        })),
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create Purchase Requisition");
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="New Purchase Requisition (PR)"
        icon={FileText}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-in fade-in duration-150 ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface shadow-elevation-3 border border-border flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "relative w-full max-w-2xl max-h-[90vh] rounded-lg"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h3 font-semibold text-ink">New Purchase Requisition (PR)</h3>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full border border-success/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-Approved
                </span>
              )}
            </div>
            <p className="text-caption text-text-muted mt-0.5">
              {isSuperAdmin
                ? "Super Admin auto-approval: this requisition is approved immediately upon creation."
                : "Initiate an internal procurement requirement for approval"}
            </p>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Requisition Number *
              </label>
              <input
                type="text"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value.toUpperCase())}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Branch *
              </label>
              <select
                value={branchId || (branches[0]?.id ?? "")}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {branches.length === 0 && (
                  <option value="">(No branch available)</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items section */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-caption font-semibold text-ink uppercase tracking-wider">
                Requested Item Lines ({lines.length})
              </h4>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 text-caption font-medium text-primary hover:text-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-page-bg/60 border border-border/80 rounded-sm flex items-start gap-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Product *
                        </label>
                        <ProductSearchSelect
                          products={products}
                          selectedProductId={line.productId}
                          onSelect={(p) => handleLineChange(idx, "productId", p?.id ?? "")}
                          placeholder="Search product..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-0.5">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          required
                          className="w-full h-9 px-2.5 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(e) => handleLineChange(idx, "notes", e.target.value)}
                        placeholder="Purpose / Project notes (optional)"
                        className="w-full h-8 px-2.5 border border-border/80 rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors mt-5"
                      title="Remove Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-border rounded-sm text-body text-ink font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-sm text-body font-medium hover:bg-primary-hover shadow-elevation-1 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSuperAdmin ? "Creating & Approving..." : "Submitting..."}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{isSuperAdmin ? "Create & Auto-Approve" : "Submit Requisition"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
