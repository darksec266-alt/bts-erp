"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, Loader2, Link2, ShoppingCart, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import type {
  PurchaseOrderDto,
  PurchaseRequestDto,
  SupplierDto,
  ProductDto,
  BranchDto,
} from "@bts/shared-types";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (po: PurchaseOrderDto) => void;
  approvedPrs: PurchaseRequestDto[];
  suppliers: SupplierDto[];
  products: ProductDto[];
  branches: BranchDto[];
  initialPrId?: string;
}

interface POLineForm {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  approvedPrs,
  suppliers,
  products,
  branches,
  initialPrId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [poNumber, setPoNumber] = useState(
    `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [selectedPrId, setSelectedPrId] = useState(initialPrId || "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [lines, setLines] = useState<POLineForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group approved PRs by completion status
  const pendingPrs = approvedPrs.filter((p) => !p.purchaseOrder);
  const completedPrs = approvedPrs.filter((p) => !!p.purchaseOrder);
  const selectedPr = approvedPrs.find((p) => p.id === selectedPrId);

  useEffect(() => {
    if (isOpen) {
      if (initialPrId) {
        setSelectedPrId(initialPrId);
      }
      if (branches.length > 0 && (!branchId || !branches.some((b) => b.id === branchId))) {
        setBranchId(branches[0].id);
      }
      if (suppliers.length > 0 && (!supplierId || !suppliers.some((s) => s.id === supplierId))) {
        setSupplierId(suppliers[0].id);
      }
      if (!selectedPrId && !initialPrId) {
        setPoNumber(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      }
      setError(null);
    }
  }, [isOpen, initialPrId, branches, branchId, suppliers, supplierId, selectedPrId]);

  // Initialize lines when modal opens or selectedPrId changes
  useEffect(() => {
    if (selectedPrId) {
      const pr = approvedPrs.find((p) => p.id === selectedPrId);
      if (pr && pr.lines && pr.lines.length > 0) {
        setBranchId(pr.branchId);
        const mapped = pr.lines.map((l) => {
          const prod = products.find((p) => p.id === l.productId);
          const cost = prod ? Number(prod.costPrice) || 1000 : 1000;
          return {
            productId: l.productId,
            quantity: Number(l.quantity) || 1,
            unitPrice: cost,
          };
        });
        setLines(mapped);
        return;
      }
    }

    if (lines.length === 0 && products.length > 0) {
      const defaultProd = products[0];
      setLines([
        {
          productId: defaultProd.id,
          quantity: 1,
          unitPrice: Number(defaultProd.costPrice) || 5000,
        },
      ]);
    }
  }, [selectedPrId, approvedPrs, products]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    const defaultProd = products[0];
    setLines((prev) => [
      ...prev,
      {
        productId: defaultProd?.id || "",
        quantity: 1,
        unitPrice: defaultProd ? Number(defaultProd.costPrice) || 1000 : 1000,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof POLineForm,
    value: string | number
  ) => {
    setLines((prev) => {
      const next = [...prev];
      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        next[idx] = {
          ...next[idx],
          productId: String(value),
          unitPrice: prod ? Number(prod.costPrice) || next[idx].unitPrice : next[idx].unitPrice,
        };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  const grandTotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSupplierId = supplierId || suppliers[0]?.id;
    const effectiveBranchId = branchId || branches[0]?.id;

    if (selectedPr?.purchaseOrder) {
      setError(
        `Requisition ${selectedPr.requestNumber} is already completed under PO ${selectedPr.purchaseOrder.poNumber}. A duplicate PO cannot be issued.`
      );
      return;
    }

    if (!effectiveSupplierId) {
      setError("Please select a Supplier.");
      return;
    }
    if (!effectiveBranchId) {
      setError("Please select a Branch.");
      return;
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0 || l.unitPrice <= 0)) {
      setError("All lines must have a valid product, quantity > 0, and unit price > 0.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await api.createPurchaseOrder({
        poNumber: poNumber.trim(),
        purchaseRequestId: selectedPrId || undefined,
        supplierId: effectiveSupplierId,
        branchId: effectiveBranchId,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Generate Purchase Order (PO)"
        icon={ShoppingCart}
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
            : "relative w-full max-w-3xl max-h-[90vh] rounded-lg"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div>
            <h3 className="text-h3 font-semibold text-ink">Generate Purchase Order (PO)</h3>
            <p className="text-caption text-text-muted mt-0.5">
              Issue a legally binding purchase contract to an authorized supplier
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-70px)]">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* PR linkage bar */}
          <div className="p-3 bg-page-bg/80 border border-border rounded-sm space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-caption">
                <Link2 className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-ink">Link to Approved Requisition:</span>
                <span className="text-[11px] text-text-muted">
                  ({pendingPrs.length} pending PO, {completedPrs.length} completed)
                </span>
              </div>
              <select
                value={selectedPrId}
                onChange={(e) => setSelectedPrId(e.target.value)}
                className="h-8 px-2 border border-border rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              >
                <option value="">None (Standalone Direct PO)</option>
                {pendingPrs.length > 0 && (
                  <optgroup label={`📋 Approved & Awaiting PO (${pendingPrs.length})`}>
                    {pendingPrs.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.requestNumber} ({pr.lines.length} items) - Awaiting PO
                      </option>
                    ))}
                  </optgroup>
                )}
                {completedPrs.length > 0 && (
                  <optgroup label={`✅ Completed / PO Issued (${completedPrs.length})`}>
                    {completedPrs.map((pr) => (
                      <option key={pr.id} value={pr.id} disabled>
                        {pr.requestNumber} — [DONE: {pr.purchaseOrder?.poNumber || "PO"}]
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedPr && (
              <div
                className={`p-2.5 rounded text-xs flex items-center justify-between ${
                  selectedPr.purchaseOrder
                    ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    : "bg-success/10 text-success border border-success/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedPr.purchaseOrder ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                  )}
                  <span>
                    {selectedPr.purchaseOrder ? (
                      <>
                        <strong>Requisition Already Completed:</strong> {selectedPr.requestNumber} was already fulfilled under PO <strong>{selectedPr.purchaseOrder.poNumber}</strong>. A duplicate PO cannot be issued.
                      </>
                    ) : (
                      <>
                        <strong>Requisition Selected:</strong> {selectedPr.requestNumber} ({selectedPr.lines.length} items) is ready to convert to Purchase Order.
                      </>
                    )}
                  </span>
                </div>
                {selectedPr.purchaseOrder && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-800 rounded">
                    Completed
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                PO Number *
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Supplier *
              </label>
              <select
                value={supplierId || (suppliers[0]?.id ?? "")}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {suppliers.length === 0 && (
                  <option value="">(No supplier available)</option>
                )}
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Delivery Branch *
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
                Order Items & Pricing ({lines.length})
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

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => {
                const lineTotal =
                  (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-page-bg/60 border border-border/80 rounded-sm grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-medium text-text-muted mb-0.5 sm:hidden">
                        Product
                      </label>
                      <ProductSearchSelect
                        products={products}
                        selectedProductId={line.productId}
                        onSelect={(p) => handleLineChange(idx, "productId", p?.id ?? "")}
                        placeholder="Search product..."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-medium text-text-muted mb-0.5 sm:hidden">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        placeholder="Qty"
                        required
                        className="w-full h-9 px-2 border border-border rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-medium text-text-muted mb-0.5 sm:hidden">
                        Unit Price (BDT)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          handleLineChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Price"
                        required
                        className="w-full h-9 px-2 border border-border rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <span className="text-[10px] text-text-muted sm:hidden">Total: </span>
                      <span className="text-caption font-semibold text-ink font-mono">
                        ৳{lineTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="sm:col-span-1 text-right">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grand Total Summary Box */}
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-sm flex items-center justify-between">
              <div>
                <span className="text-caption font-medium text-text-muted">Total Order Valuation:</span>
                <span className="text-[11px] text-text-muted ml-2">({lines.length} line items)</span>
              </div>
              <span className="text-h3 font-bold text-primary font-mono">
                ৳{grandTotal.toLocaleString()} BDT
              </span>
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
                  <span>Issuing PO...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Issue Purchase Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
