"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ShoppingCart, Check, AlertCircle, Loader2, PackageCheck, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import type { SalesOrderDto, BranchDto, CustomerDto, ProductDto } from "@bts/shared-types";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: SalesOrderDto) => void;
  branches: BranchDto[];
  customers: CustomerDto[];
  products: ProductDto[];
  defaultBranchId?: string;
}

interface LineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  availableStock?: number;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  customers,
  products,
  defaultBranchId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [orderNumber, setOrderNumber] = useState(
    () => `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");

  const [lines, setLines] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultBranchId) {
      setBranchId(defaultBranchId);
    } else if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, defaultBranchId, branchId]);

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Sales Order (${orderNumber})`}
        icon={<ShoppingCart className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleAddLine = () => {
    setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, selectedProductId: string) => {
    if (!selectedProductId) {
      setLines((prev) =>
        prev.map((l, i) => (i === index ? { ...l, productId: undefined, availableStock: undefined } : l))
      );
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        return {
          ...l,
          productId: prod.id,
          description: prod.name,
          unitPrice: Number(prod.sellingPrice) || 0,
          availableStock: prod.totalStock ?? 0,
        };
      })
    );
  };

  const handleLineChange = (index: number, field: keyof LineItemInput, value: string | number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          [field]: value,
        };
      })
    );
  };

  const grandTotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCustomerId = customerId || customers[0]?.id;
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!effectiveCustomerId) {
      setError("Please select a customer.");
      return;
    }
    if (!effectiveBranchId) {
      setError("Please select an operating branch.");
      return;
    }

    const invalidLines = lines.some((l) => !l.description.trim() || l.quantity <= 0);
    if (invalidLines) {
      setError("Every line item must have a description and quantity greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await api.createSalesOrder({
        orderNumber: orderNumber.trim() || undefined,
        customerId: effectiveCustomerId,
        branchId: effectiveBranchId,
        lines: lines.map((l) => ({
          productId: l.productId || undefined,
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
        })),
      });

      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${isMaximized ? "p-0" : "p-4"}`}>
      <div className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0" : "relative w-full max-w-4xl rounded-md my-8"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Create Direct Sales Order</h2>
              <p className="text-caption text-text-muted">
                Record an immediate customer purchase without a preliminary quotation.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Top Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Order #
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary focus:bg-surface outline-none"
                placeholder="SO-2026-XXXX"
              />
            </div>

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
                {customers.length === 0 ? (
                  <option value="">No active customers</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.customerCode})
                    </option>
                  ))
                )}
              </select>
            </div>

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

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-ink uppercase tracking-wider">
                Sales Order Line Items ({lines.length})
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 text-caption font-medium rounded-sm border border-primary/30 text-primary hover:bg-primary-tint flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left text-body">
                <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product / Item Description</th>
                    <th className="py-2.5 px-3 w-28">Qty</th>
                    <th className="py-2.5 px-3 w-32">Unit Price (৳)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Total (৳)</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => {
                    const rowTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                    const isExceedingStock =
                      line.productId &&
                      line.availableStock !== undefined &&
                      Number(line.quantity) > line.availableStock;

                    return (
                      <tr key={idx} className="hover:bg-page-bg/30 align-top">
                        <td className="py-3 px-3 text-caption text-text-muted font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 space-y-1.5">
                          {/* Product Instant Search Selector */}
                          <ProductSearchSelect
                            products={products}
                            selectedProductId={line.productId}
                            onSelect={(prod) => handleProductSelect(idx, prod ? prod.id : "")}
                            allowCustomItem
                            customItemLabel="⚡ Custom / Non-Catalog Item"
                            placeholder="Instant search by product name or SKU..."
                            priceType="selling"
                          />

                          {/* Item Specification / Name */}
                          <input
                            type="text"
                            placeholder="Item name / specification details"
                            value={line.description}
                            onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                            required
                          />

                          {/* Live Warehouse Stock Badge */}
                          {line.productId && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {(line.availableStock ?? 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-success-tint text-success border border-success/20">
                                  <PackageCheck className="w-3 h-3" />
                                  <span>In Stock: {line.availableStock} on hand</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-danger-tint text-danger border border-danger/20">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Out of Stock (0 available)</span>
                                </span>
                              )}

                              {isExceedingStock && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-warning-tint text-warning border border-warning/20">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Order exceeds on-hand stock ({line.availableStock})</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) =>
                              handleLineChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                            }
                            className={`w-full px-2 py-1.5 text-body rounded-sm border ${
                              isExceedingStock ? "border-warning bg-warning-tint/10" : "border-border bg-page-bg"
                            } text-ink text-center focus:border-primary focus:bg-surface outline-none`}
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleLineChange(idx, "unitPrice", Number(e.target.value))
                            }
                            className="w-full px-2 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink text-right focus:border-primary focus:bg-surface outline-none"
                            required
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                          ৳{rowTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            disabled={lines.length <= 1}
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 rounded text-text-muted hover:text-danger disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Summary Row */}
            <div className="flex justify-end pt-2">
              <div className="w-72 p-3.5 rounded-sm bg-page-bg border border-border space-y-1.5 text-body">
                <div className="flex items-center justify-between text-caption text-text-muted">
                  <span>Subtotal ({lines.length} items):</span>
                  <span className="font-mono">
                    ৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between font-bold text-h3 text-ink">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">
                    ৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              disabled={loading || customers.length === 0}
              className="px-5 py-2 text-body font-medium rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Sales Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
