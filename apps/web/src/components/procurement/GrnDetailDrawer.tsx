"use client";

import React, { useState } from "react";
import {
  PackageCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Printer,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { GoodsReceiptNoteDto, PurchaseOrderDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";
import { api } from "../../lib/api";

interface GrnDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grn: GoodsReceiptNoteDto | null;
  purchaseOrders?: PurchaseOrderDto[];
  onViewPo?: (po: PurchaseOrderDto) => void;
  onReceiveRemaining?: (po: PurchaseOrderDto) => void;
  onRefresh?: () => void;
  addToast?: (type: "success" | "error" | "info", message: string) => void;
}

export const GrnDetailDrawer: React.FC<GrnDetailDrawerProps> = ({
  isOpen,
  onClose,
  grn,
  purchaseOrders = [],
  onViewPo,
  onReceiveRemaining,
  onRefresh,
  addToast,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!isOpen || !grn) return null;

  // Find linked PO
  const linkedPo =
    purchaseOrders.find(
      (p) => p.id === grn.purchaseOrderId || p.poNumber === grn.purchaseOrder?.poNumber
    ) || (grn.purchaseOrder as PurchaseOrderDto | undefined);

  // Compute item counts and shortages
  let totalOrdered = 0;
  let totalReceived = 0;
  let totalShort = 0;
  let totalDamaged = 0;

  const linesWithCalculations = grn.lines.map((line) => {
    // Find matching line in PO
    const poLine = linkedPo?.lines?.find(
      (pl) => pl.id === line.purchaseOrderLineId || pl.productId === line.productId
    );
    const orderedQty = Number(line.purchaseOrderLine?.quantity || poLine?.quantity || 0);
    const receivedQty = Number(line.quantityReceived || 0);
    const shortQty = Math.max(0, orderedQty - receivedQty);

    totalOrdered += orderedQty;
    totalReceived += receivedQty;
    totalShort += shortQty;
    if (line.condition === "DAMAGED" || line.condition === "WRONG_SKU") {
      totalDamaged += receivedQty;
    }

    return {
      ...line,
      orderedQty,
      receivedQty,
      shortQty,
      productName: line.product?.name || poLine?.product?.name || "Product Item",
      productSku: line.product?.sku || poLine?.product?.sku || "SKU-N/A",
    };
  });

  const handleCopyGrn = () => {
    navigator.clipboard.writeText(grn.grnNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolveDiscrepancy = async () => {
    setResolving(true);
    try {
      await api.approveGrn(grn.id);
      addToast?.("success", `GRN ${grn.grnNumber} discrepancy marked as RESOLVED!`);
      onRefresh?.();
      onClose();
    } catch (err: unknown) {
      addToast?.("error", err instanceof Error ? err.message : "Failed to resolve discrepancy");
    } finally {
      setResolving(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`GRN Details - ${grn.grnNumber}`}
        icon={PackageCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen bg-surface border-l border-border shadow-elevation-3 flex flex-col transition-all duration-200 ${
            isMaximized ? "max-w-none w-full" : "max-w-2xl"
          }`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-border bg-page-bg/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-success-tint text-success border border-success/20 flex items-center gap-1">
                  <PackageCheck className="w-3 h-3" />
                  GOODS RECEIPT (GRN)
                </span>
                <span className="text-caption text-text-muted font-mono flex items-center gap-1">
                  {grn.grnNumber}
                  <button
                    type="button"
                    onClick={handleCopyGrn}
                    className="hover:text-ink text-text-muted transition-colors ml-0.5"
                    title="Copy GRN Number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-bold ${
                    grn.status === "COMPLETE"
                      ? "bg-success-tint text-success"
                      : grn.status === "PARTIAL"
                      ? "bg-warning-tint text-warning"
                      : "bg-danger-tint text-danger"
                  }`}
                >
                  {grn.status}
                </span>
              </div>
              <h2 className="text-h3 font-bold text-ink mt-1">Consignment Receipt Details</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-border/40 transition-colors"
                title="Print Receipt Slip"
              >
                <Printer className="w-4 h-4" />
              </button>
              <WindowHeaderActions
                isMaximized={isMaximized}
                onToggleMaximize={() => setIsMaximized(!isMaximized)}
                onMinimize={() => setIsMinimized(true)}
                onClose={onClose}
              />
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Alert Banners */}
            {grn.status === "DISCREPANT" && (
              <div className="p-4 rounded-md bg-danger/10 border border-danger/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-body font-bold text-danger">Discrepancy Reported in Consignment</h4>
                    <p className="text-caption text-ink/80 mt-0.5">
                      Items were received short, damaged, or with mismatched SKUs. An approval request has been filed.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={resolving}
                  onClick={handleResolveDiscrepancy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger text-white rounded-sm text-caption font-semibold hover:bg-danger/90 transition-all shrink-0 disabled:opacity-50"
                >
                  {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Resolve Discrepancy</span>
                </button>
              </div>
            )}

            {grn.status === "PARTIAL" && (
              <div className="p-4 rounded-md bg-warning/10 border border-warning/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-body font-bold text-warning">Partial Delivery (Goods Still Pending)</h4>
                    <p className="text-caption text-ink/80 mt-0.5">
                      This shipment contains part of the ordered batch. {totalShort} units remain to be delivered by the vendor.
                    </p>
                  </div>
                </div>
                {linkedPo && onReceiveRemaining && (
                  <button
                    type="button"
                    onClick={() => {
                      onReceiveRemaining(linkedPo);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning text-white rounded-sm text-caption font-semibold hover:bg-warning/90 transition-all shrink-0"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Receive Next Batch</span>
                  </button>
                )}
              </div>
            )}

            {grn.status === "COMPLETE" && (
              <div className="p-3.5 rounded-md bg-success/10 border border-success/20 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <p className="text-caption text-success font-medium">
                  <strong>Consignment Complete:</strong> All items in this receipt have been verified and accepted into stock.
                </p>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Total Ordered</span>
                <span className="text-body font-bold text-ink font-mono block mt-0.5">
                  {totalOrdered > 0 ? totalOrdered : "—"}
                </span>
                <span className="text-[10px] text-text-muted">PO requested qty</span>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Received In Hand</span>
                <span className="text-body font-bold text-success font-mono block mt-0.5">
                  {totalReceived} units
                </span>
                <span className="text-[10px] text-text-muted">Physically counted</span>
              </div>

              <div className={`p-3 rounded border ${totalShort > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-page-bg border-border"}`}>
                <span className="text-[11px] text-text-muted block">Short / Missing</span>
                <span className={`text-body font-bold font-mono block mt-0.5 ${totalShort > 0 ? "text-amber-700" : "text-text-muted"}`}>
                  {totalShort > 0 ? `${totalShort} missing` : "None"}
                </span>
                <span className="text-[10px] text-text-muted">Undelivered items</span>
              </div>

              <div className={`p-3 rounded border ${totalDamaged > 0 ? "bg-danger/10 border-danger/30" : "bg-page-bg border-border"}`}>
                <span className="text-[11px] text-text-muted block">Damaged / Rejected</span>
                <span className={`text-body font-bold font-mono block mt-0.5 ${totalDamaged > 0 ? "text-danger" : "text-text-muted"}`}>
                  {totalDamaged > 0 ? `${totalDamaged} flagged` : "0 (Passed QC)"}
                </span>
                <span className="text-[10px] text-text-muted">Quality defects</span>
              </div>
            </div>

            {/* Linked Purchase Order & Logistics Card */}
            <div className="p-4 bg-page-bg/60 rounded-md border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h4 className="text-caption font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Logistics & Order Context</span>
                </h4>
                {linkedPo && onViewPo && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewPo(linkedPo);
                      onClose();
                    }}
                    className="text-caption font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View PO {linkedPo.poNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
                <div>
                  <span className="text-caption text-text-muted block">Purchase Order</span>
                  <span className="font-mono font-bold text-xs text-primary">
                    {grn.purchaseOrder?.poNumber || grn.purchaseOrderId}
                  </span>
                </div>

                <div>
                  <span className="text-caption text-text-muted block">Supplier</span>
                  <span className="font-semibold text-ink">
                    {grn.purchaseOrder?.supplier?.companyName || linkedPo?.supplier?.companyName || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-caption text-text-muted block">Destination Branch</span>
                  <span className="text-ink">
                    {grn.purchaseOrder?.branch?.name || linkedPo?.branch?.name || "Operating Branch"}
                  </span>
                </div>

                <div>
                  <span className="text-caption text-text-muted block">Received Date & Time</span>
                  <span className="text-ink flex items-center gap-1 text-caption">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    {new Date(grn.receivedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Line Verification Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-caption font-semibold text-ink uppercase tracking-wider">
                  Itemized Goods Verification ({grn.lines.length} lines)
                </h4>
                <span className="text-[11px] text-text-muted">
                  Ordered vs Received In Hand vs Shortage
                </span>
              </div>

              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <table className="w-full text-left border-collapse text-body">
                  <thead>
                    <tr className="border-b border-border bg-page-bg/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-3 text-right">PO Ordered</th>
                      <th className="py-2.5 px-3 text-right">Received In Hand</th>
                      <th className="py-2.5 px-3 text-right">Short / Missing</th>
                      <th className="py-2.5 px-3 text-right">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {linesWithCalculations.map((line) => (
                      <tr key={line.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-ink text-caption">{line.productName}</p>
                          <p className="text-[11px] text-text-muted font-mono">{line.productSku}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-caption text-text-muted">
                          {line.orderedQty > 0 ? line.orderedQty : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-caption text-success">
                          {line.receivedQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-caption">
                          {line.shortQty > 0 ? (
                            <span className="text-amber-700 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              -{line.shortQty} short
                            </span>
                          ) : (
                            <span className="text-success text-[11px]">Full</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              line.condition === "GOOD"
                                ? "bg-success-tint text-success"
                                : line.condition === "SHORT"
                                ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                : "bg-danger-tint text-danger"
                            }`}
                          >
                            {line.condition === "GOOD" ? "PASSED QC" : line.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-border bg-page-bg/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-sm text-body text-ink font-medium hover:bg-page-bg transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {grn.status === "PARTIAL" && linkedPo && onReceiveRemaining && (
                <button
                  type="button"
                  onClick={() => {
                    onReceiveRemaining(linkedPo);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-sm text-body font-medium hover:bg-primary-hover shadow-elevation-1 transition-all"
                >
                  <Truck className="w-4 h-4" />
                  <span>Receive Remaining Goods</span>
                </button>
              )}

              {grn.status === "DISCREPANT" && (
                <button
                  type="button"
                  disabled={resolving}
                  onClick={handleResolveDiscrepancy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-danger text-white rounded-sm text-body font-medium hover:bg-danger/90 shadow-elevation-1 transition-all disabled:opacity-50"
                >
                  {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Resolve Discrepancy</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
