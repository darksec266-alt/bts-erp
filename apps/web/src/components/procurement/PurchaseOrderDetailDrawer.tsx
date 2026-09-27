"use client";

import React, { useState } from "react";
import {
  Building,
  PackageCheck,
  FileText,
  Clock,
  Printer,
  ShoppingCart,
} from "lucide-react";
import type { PurchaseOrderDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface PurchaseOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderDto | null;
  onRecordGrn?: (po: PurchaseOrderDto) => void;
}

export const PurchaseOrderDetailDrawer: React.FC<PurchaseOrderDetailDrawerProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onRecordGrn,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !purchaseOrder) return null;

  const totalLines = purchaseOrder.lines?.length || 0;
  const grandTotal = Number(purchaseOrder.grandTotal) || 0;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`PO Details - ${purchaseOrder.poNumber}`}
        icon={ShoppingCart}
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
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                  PURCHASE ORDER
                </span>
                <span className="text-caption text-text-muted font-mono">
                  {purchaseOrder.poNumber}
                </span>
              </div>
              <h2 className="text-h3 font-bold text-ink mt-1">
                Order Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-border/40 transition-colors"
                title="Print Order"
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
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Grand Total</span>
                <span className="text-body font-bold text-primary font-mono block mt-0.5">
                  ৳{grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Fulfillment</span>
                <span className="mt-0.5 block">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      purchaseOrder.fulfillmentStatus === "CANCELLED" || (purchaseOrder as any).status === "CANCELLED"
                        ? "bg-red-500/10 text-red-700 border-red-500/20"
                        : purchaseOrder.fulfillmentStatus === "FULLY_RECEIVED"
                        ? "bg-success/10 text-success border-success/20"
                        : purchaseOrder.fulfillmentStatus === "PARTIALLY_RECEIVED"
                        ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                    }`}
                  >
                    {purchaseOrder.fulfillmentStatus === "CANCELLED" || (purchaseOrder as any).status === "CANCELLED"
                      ? "Cancelled"
                      : purchaseOrder.fulfillmentStatus === "FULLY_RECEIVED"
                      ? "Fully Received"
                      : purchaseOrder.fulfillmentStatus === "PARTIALLY_RECEIVED"
                      ? "Partially Received"
                      : "Pending Receipt"}
                  </span>
                </span>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Units Received</span>
                <span className="text-body font-bold text-ink block mt-0.5 font-mono">
                  {purchaseOrder.totalReceivedQuantity ?? 0} / {purchaseOrder.totalOrderedQuantity ?? totalLines}
                </span>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Supplier</span>
                <span className="text-caption font-semibold text-ink truncate block mt-0.5" title={purchaseOrder.supplier?.companyName}>
                  {purchaseOrder.supplier?.companyName || "N/A"}
                </span>
              </div>

              <div className="p-3 bg-page-bg rounded border border-border">
                <span className="text-[11px] text-text-muted block">Destination</span>
                <span className="text-caption font-semibold text-ink block mt-0.5">
                  {purchaseOrder.branch?.name || "Main Branch"}
                </span>
              </div>
            </div>

            {/* Linked Requisition info */}
            {purchaseOrder.purchaseRequest && (
              <div className="p-3 bg-purple/5 border border-purple/20 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple shrink-0" />
                  <span className="text-caption text-ink font-medium">
                    Converted from Approved Requisition:{" "}
                    <strong className="font-mono">{purchaseOrder.purchaseRequest.requestNumber}</strong>
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-success/10 text-success rounded font-semibold border border-success/20">
                  Approved
                </span>
              </div>
            )}

            {/* Ordered Line Items Table */}
            <div>
              <h3 className="text-caption font-semibold text-ink uppercase tracking-wider mb-3">
                Contracted Line Items ({totalLines})
              </h3>
              <div className="border border-border rounded-sm overflow-hidden bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                      <th className="py-2.5 px-3 font-semibold">SKU & Item Name</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Ordered</th>
                      <th className="py-2.5 px-3 font-semibold text-center text-success">Received</th>
                      <th className="py-2.5 px-3 font-semibold text-center text-amber-700">Remaining</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-body">
                    {purchaseOrder.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-page-bg/30">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-ink text-caption">
                            {l.product?.name || "Standard Equipment"}
                          </p>
                          <p className="text-[11px] text-text-muted font-mono">
                            {l.product?.sku || "SKU-N/A"}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-center text-caption font-mono font-medium">
                          {l.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center text-caption font-mono font-bold text-success">
                          {l.receivedQuantity ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-center text-caption font-mono font-bold text-amber-700">
                          {l.remainingQuantity ?? l.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-caption font-mono">
                          ৳{Number(l.unitPrice).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-caption font-bold text-ink font-mono">
                          ৳{Number(l.lineTotal).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-page-bg/80 border-t border-border font-bold">
                      <td colSpan={5} className="py-2.5 px-3 text-right text-caption text-text-muted">
                        Grand Total:
                      </td>
                      <td className="py-2.5 px-3 text-right text-body text-primary font-mono">
                        ৳{grandTotal.toLocaleString()} BDT
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Linked Goods Receipt Notes */}
            {purchaseOrder.grns && purchaseOrder.grns.length > 0 && (
              <div>
                <h3 className="text-caption font-semibold text-ink uppercase tracking-wider mb-2">
                  Linked Goods Receipts ({purchaseOrder.grns.length})
                </h3>
                <div className="space-y-2">
                  {purchaseOrder.grns.map((g) => (
                    <div key={g.id} className="p-3 bg-page-bg/60 border border-border rounded-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-4 h-4 text-primary" />
                        <div>
                          <span className="font-mono font-bold text-xs text-ink block">{g.grnNumber}</span>
                          <span className="text-[11px] text-text-muted">
                            {g.receivedAt ? new Date(g.receivedAt).toLocaleDateString() : "Recorded"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          g.status === "COMPLETE"
                            ? "bg-success/10 text-success border-success/20"
                            : g.status === "PARTIAL"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            : g.status === "CANCELLED"
                            ? "bg-danger/10 text-danger border-danger/20"
                            : "bg-purple/10 text-purple border-purple/20"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier & Delivery information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-page-bg/60 border border-border rounded-sm space-y-2">
                <h4 className="text-caption font-semibold text-ink flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-text-muted" />
                  <span>Vendor Information</span>
                </h4>
                <p className="text-body font-medium text-ink">
                  {purchaseOrder.supplier?.companyName}
                </p>
                <p className="text-caption text-text-muted font-mono">
                  Vendor ID: {purchaseOrder.supplier?.supplierCode}
                </p>
              </div>

              <div className="p-4 bg-page-bg/60 border border-border rounded-sm space-y-2">
                <h4 className="text-caption font-semibold text-ink flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <span>Order Audit Details</span>
                </h4>
                <p className="text-caption text-text-muted">
                  Issued:{" "}
                  <span className="font-medium text-ink">
                    {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-caption text-text-muted">
                  Branch ID: <span className="font-mono text-ink">{purchaseOrder.branchId}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-border bg-page-bg flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-sm text-body text-ink font-medium hover:bg-surface transition-colors"
            >
              Close
            </button>
            {onRecordGrn &&
              purchaseOrder.fulfillmentStatus !== "FULLY_RECEIVED" &&
              purchaseOrder.fulfillmentStatus !== "CANCELLED" &&
              (purchaseOrder as any).status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => {
                    onRecordGrn(purchaseOrder);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-success text-white rounded-sm text-body font-medium hover:bg-success/90 shadow-elevation-1 transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive Goods (GRN)</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
