"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";
import type { PurchaseOrderDto, GoodsReceiptNoteDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (grn: GoodsReceiptNoteDto) => void;
  purchaseOrder: PurchaseOrderDto;
  existingGrns?: GoodsReceiptNoteDto[];
}

interface GRNLineForm {
  purchaseOrderLineId: string;
  productId: string;
  productName: string;
  productSku: string;
  orderedQuantity: number;
  previouslyReceived: number;
  remainingDue: number;
  quantityReceived: number;
  condition: "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU";
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
  existingGrns = [],
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [grnNumber, setGrnNumber] = useState(
    `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [status, setStatus] = useState<"COMPLETE" | "PARTIAL" | "DISCREPANT">("COMPLETE");
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [lines, setLines] = useState<GRNLineForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    if (!isOpen) return;
    api.getWarehouses({ isActive: true, take: 50 }).then((res) => {
      const items = res.items || [];
      setWarehouses(items);
      if (items.length > 0 && !warehouseId) {
        setWarehouseId(items[0].id);
      }
    }).catch(console.error);
  }, [isOpen]);

  // Initialize lines based on PO and existing receipts
  useEffect(() => {
    if (!isOpen || !purchaseOrder) return;

    const poGrns = existingGrns.filter(
      (g) => g.purchaseOrderId === purchaseOrder.id || g.purchaseOrder?.poNumber === purchaseOrder.poNumber
    );

    const initialLines: GRNLineForm[] = purchaseOrder.lines.map((l) => {
      const orderedQty = Number(l.quantity) || 0;
      // Calculate how many have already been received across earlier GRNs for this PO line
      let prevRcvd = typeof l.receivedQuantity === "number" ? l.receivedQuantity : 0;
      if (prevRcvd === 0 && poGrns.length > 0) {
        prevRcvd = poGrns
          .flatMap((g) => g.lines || [])
          .filter(
            (gl) =>
              (gl.purchaseOrderLineId === l.id || gl.productId === l.productId) &&
              gl.condition !== "DAMAGED" &&
              gl.condition !== "WRONG_SKU"
          )
          .reduce((sum, gl) => sum + Number(gl.quantityReceived || 0), 0);
      }

      const remaining = typeof l.remainingQuantity === "number" ? l.remainingQuantity : Math.max(0, orderedQty - prevRcvd);

      return {
        purchaseOrderLineId: l.id,
        productId: l.productId,
        productName: l.product?.name || "Product Item",
        productSku: l.product?.sku || "SKU-N/A",
        orderedQuantity: orderedQty,
        previouslyReceived: prevRcvd,
        remainingDue: remaining,
        quantityReceived: remaining, // default to receiving the remaining due
        condition: "GOOD",
      };
    });

    setLines(initialLines);
    setGrnNumber(`GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`);

    // Determine initial status
    const allDone = initialLines.every((l) => l.remainingDue === 0);
    if (allDone) {
      setStatus("COMPLETE");
    } else {
      setStatus("COMPLETE");
    }
  }, [isOpen, purchaseOrder, existingGrns]);

  if (!isOpen) return null;

  // Handle line inputs
  const handleLineQuantityChange = (idx: number, qty: number) => {
    setLines((prev) => {
      const next = [...prev];
      const target = { ...next[idx] };
      const safeQty = Math.max(0, qty);
      target.quantityReceived = safeQty;

      // Auto-set condition to SHORT if 0 or less than remaining
      if (safeQty === 0 && target.remainingDue > 0) {
        target.condition = "SHORT";
      } else if (safeQty < target.remainingDue && target.condition === "GOOD") {
        target.condition = "SHORT";
      } else if (safeQty >= target.remainingDue && target.condition === "SHORT") {
        target.condition = "GOOD";
      }

      next[idx] = target;

      // Re-evaluate overall consignment status
      const hasDefect = next.some((l) => l.condition === "DAMAGED" || l.condition === "WRONG_SKU");
      const hasShort = next.some((l) => l.quantityReceived < l.remainingDue);

      if (hasDefect) {
        setStatus("DISCREPANT");
      } else if (hasShort) {
        setStatus("PARTIAL");
      } else {
        setStatus("COMPLETE");
      }

      return next;
    });
  };

  const handleLineConditionChange = (
    idx: number,
    condition: "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU"
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], condition };

      const hasDefect = next.some((l) => l.condition === "DAMAGED" || l.condition === "WRONG_SKU");
      const hasShort = next.some((l) => l.quantityReceived < l.remainingDue);

      if (hasDefect) {
        setStatus("DISCREPANT");
      } else if (hasShort && status !== "DISCREPANT") {
        setStatus("PARTIAL");
      }
      return next;
    });
  };

  // Quick mass action buttons
  const handleReceiveAllInFull = () => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantityReceived: l.remainingDue,
        condition: "GOOD",
      }))
    );
    setStatus("COMPLETE");
  };

  const handleMarkAllZero = () => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantityReceived: 0,
        condition: "SHORT",
      }))
    );
    setStatus("PARTIAL");
  };

  // Calculations for summary KPI banner
  const totalOrderedQty = lines.reduce((sum, l) => sum + l.orderedQuantity, 0);
  const totalPreviouslyReceived = lines.reduce((sum, l) => sum + l.previouslyReceived, 0);
  const totalRemainingDue = lines.reduce((sum, l) => sum + l.remainingDue, 0);
  const totalReceivedInHand = lines.reduce((sum, l) => sum + l.quantityReceived, 0);
  const totalShortage = Math.max(0, totalRemainingDue - totalReceivedInHand);
  const totalFlagged = lines.reduce(
    (sum, l) => sum + (l.condition === "DAMAGED" || l.condition === "WRONG_SKU" ? l.quantityReceived : 0),
    0
  );

  const submitGrnWithStatus = async (targetStatus: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT") => {
    if (lines.some((l) => l.quantityReceived < 0)) {
      setError("Received quantity cannot be negative.");
      return;
    }

    if (targetStatus !== "DRAFT" && totalReceivedInHand === 0 && targetStatus === "COMPLETE") {
      setError("Cannot mark complete when 0 items were received. Please select PARTIAL or DISCREPANT.");
      return;
    }

    if (
      targetStatus !== "DRAFT" &&
      targetStatus !== "DISCREPANT" &&
      lines.some((l) => l.quantityReceived > l.remainingDue)
    ) {
      setError("One or more items exceed the remaining quantity due. Mark as DISCREPANT if over-receiving is intentional.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await api.createGrn(purchaseOrder.id, {
        grnNumber: grnNumber.trim(),
        status: targetStatus,
        warehouseId: warehouseId || undefined,
        lines: lines.map((l) => ({
          purchaseOrderLineId: l.purchaseOrderLineId,
          productId: l.productId,
          quantityReceived: l.quantityReceived,
          condition: l.condition,
        })),
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record Goods Receipt Note");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitGrnWithStatus(status);
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Record GRN - ${purchaseOrder.poNumber}`}
        icon={PackageCheck}
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
            : "relative w-full max-w-4xl max-h-[92vh] rounded-lg"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div>
            <h3 className="text-h3 font-semibold text-ink flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-success" />
              <span>Record Goods Receipt Note (GRN)</span>
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Verify incoming delivery against PO{" "}
              <span className="font-semibold text-ink">{purchaseOrder.poNumber}</span> &bull; Supplier:{" "}
              <span className="font-medium text-ink">{purchaseOrder.supplier?.companyName || "Supplier"}</span>
            </p>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference Number, Consignment Status, and Destination Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                GRN Reference Number *
              </label>
              <input
                type="text"
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value.toUpperCase())}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Receiving Warehouse *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Consignment Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "COMPLETE" | "PARTIAL" | "DISCREPANT")}
                required
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
              >
                <option value="COMPLETE">COMPLETE — All items in full</option>
                <option value="PARTIAL">PARTIAL — Partial shipment</option>
                <option value="DISCREPANT">DISCREPANT — Shortage / Damaged</option>
              </select>
            </div>
          </div>

          {/* Live Delivery KPIs & Status Guidance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-page-bg/70 rounded-md border border-border">
            <div>
              <span className="text-[11px] text-text-muted block">PO Total Ordered</span>
              <span className="text-body font-bold text-ink font-mono">{totalOrderedQty} units</span>
              {totalPreviouslyReceived > 0 && (
                <span className="text-[10px] text-purple block">
                  ({totalPreviouslyReceived} already received)
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-text-muted block">Received In Hand Now</span>
              <span className="text-body font-bold text-success font-mono">
                {totalReceivedInHand} units
              </span>
              <span className="text-[10px] text-text-muted block">Current batch count</span>
            </div>

            <div className={totalShortage > 0 ? "text-amber-700" : "text-text-muted"}>
              <span className="text-[11px] text-text-muted block">Short / Undelivered</span>
              <span className="text-body font-bold font-mono">
                {totalShortage > 0 ? `${totalShortage} units missing` : "None (0)"}
              </span>
              <span className="text-[10px] text-text-muted block">Outstanding on PO</span>
            </div>

            <div className={totalFlagged > 0 ? "text-danger" : "text-text-muted"}>
              <span className="text-[11px] text-text-muted block">Damaged / Mismatch</span>
              <span className="text-body font-bold font-mono">
                {totalFlagged > 0 ? `${totalFlagged} units flagged` : "0 (Passed QC)"}
              </span>
              <span className="text-[10px] text-text-muted block">Defective goods</span>
            </div>
          </div>

          {/* Helper Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-caption font-semibold text-ink uppercase tracking-wider">
              Verify Shipment Items ({lines.length} lines)
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReceiveAllInFull}
                className="text-caption font-medium text-primary hover:underline flex items-center gap-1"
                title="Fill all remaining due quantities"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Receive All in Full</span>
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleMarkAllZero}
                className="text-caption font-medium text-text-muted hover:text-ink flex items-center gap-1"
                title="Zero out all received quantities"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to 0</span>
              </button>
            </div>
          </div>

          {/* Verification Table */}
          <div className="rounded-md border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="border-b border-border bg-page-bg/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    {totalPreviouslyReceived > 0 && (
                      <th className="py-2.5 px-3 text-center">Prev. Rcvd</th>
                    )}
                    <th className="py-2.5 px-3 text-center">Remaining Due</th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">Received in Hand</th>
                    <th className="py-2.5 px-3 text-center">Shortage</th>
                    <th className="py-2.5 px-3 text-right min-w-[160px]">Quality Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {lines.map((line, idx) => {
                    const shortage = Math.max(0, line.remainingDue - line.quantityReceived);
                    return (
                      <tr key={line.purchaseOrderLineId} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-ink text-caption">{line.productName}</p>
                          <p className="text-[11px] text-text-muted font-mono">{line.productSku}</p>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-medium text-caption text-text-muted">
                          {line.orderedQuantity}
                        </td>

                        {totalPreviouslyReceived > 0 && (
                          <td className="py-3 px-3 text-center font-mono text-caption text-purple font-semibold">
                            {line.previouslyReceived}
                          </td>
                        )}

                        <td className="py-3 px-3 text-center font-mono font-semibold text-caption text-ink">
                          {line.remainingDue}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleLineQuantityChange(idx, Math.max(0, line.quantityReceived - 1))}
                              className="w-7 h-7 flex items-center justify-center rounded border border-border bg-page-bg hover:bg-border/40 text-ink text-caption font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={line.quantityReceived}
                              onChange={(e) =>
                                handleLineQuantityChange(idx, parseInt(e.target.value) || 0)
                              }
                              required
                              className="w-16 h-8 px-1.5 text-center font-mono font-bold text-caption border border-border rounded-sm bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => handleLineQuantityChange(idx, line.quantityReceived + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded border border-border bg-page-bg hover:bg-border/40 text-ink text-caption font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {shortage > 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                              -{shortage} short
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-success text-[11px] font-medium">
                              Full
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <select
                            value={line.condition}
                            onChange={(e) =>
                              handleLineConditionChange(
                                idx,
                                e.target.value as "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU"
                              )
                            }
                            className={`w-full h-8 px-2 border rounded-sm bg-surface text-xs focus:outline-none font-semibold ${
                              line.condition === "GOOD"
                                ? "border-success/40 text-success"
                                : line.condition === "SHORT"
                                ? "border-amber-500/40 text-amber-700 bg-amber-500/5"
                                : "border-danger/40 text-danger bg-danger/5"
                            }`}
                          >
                            <option value="GOOD">GOOD (Passed QC)</option>
                            <option value="SHORT">SHORT (Short Delivered)</option>
                            <option value="DAMAGED">DAMAGED (Defective / Broken)</option>
                            <option value="WRONG_SKU">WRONG_SKU (Mismatch)</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contextual Notice */}
          {status === "PARTIAL" && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded text-warning text-caption flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Partial Consignment Mode:</strong> You are receiving {totalReceivedInHand} out of {totalRemainingDue} remaining units.
                You can record subsequent shipments for this PO until all units are fulfilled.
              </span>
            </div>
          )}

          {status === "DISCREPANT" && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-caption flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Discrepancy Flagged:</strong> One or more items are damaged, short-shipped, or mismatched.
                This will automatically file an internal discrepancy review for management approval.
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-border rounded-sm text-body text-ink font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => submitGrnWithStatus("DRAFT")}
                className="px-4 py-2 border border-border text-ink rounded-sm text-body font-medium hover:bg-page-bg transition-colors disabled:opacity-50"
                title="Save as Draft without modifying inventory stock"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-success text-white rounded-sm text-body font-semibold hover:bg-success/90 shadow-elevation-1 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording GRN...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Goods Received ({totalReceivedInHand} units)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
