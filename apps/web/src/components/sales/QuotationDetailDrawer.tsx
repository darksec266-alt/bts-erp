"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  Calendar,
  Phone,
  Check,
  Send,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Printer,
} from "lucide-react";
import { api } from "../../lib/api";
import type { QuotationDto, QuotationStatus } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface QuotationDetailDrawerProps {
  quotation: QuotationDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: QuotationDto) => void;
  onConverted: (salesOrderId: string) => void;
}

export const QuotationDetailDrawer: React.FC<QuotationDetailDrawerProps> = ({
  quotation,
  isOpen,
  onClose,
  onUpdate,
  onConverted,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !quotation) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Quotation: ${quotation.quotationNumber}`}
        icon={<Building2 className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await api.updateQuotationStatus(quotation.id, newStatus);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quotation status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToOrder = async () => {
    setConverting(true);
    setError(null);
    try {
      const order = await api.convertQuotation(quotation.id);
      onConverted(order.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert quotation to order.");
    } finally {
      setConverting(false);
    }
  };

  const isExpired = new Date(quotation.validUntil) < new Date() && quotation.status !== "CONVERTED";

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-page-bg text-text-muted border-border";
      case "SENT":
        return "bg-primary-tint text-primary border-primary/20";
      case "ACCEPTED":
        return "bg-success-tint text-success border-success/20";
      case "REJECTED":
        return "bg-danger-tint text-danger border-danger/20";
      case "EXPIRED":
        return "bg-warning-tint text-warning border-warning/20";
      case "CONVERTED":
        return "bg-purple-tint text-purple border-purple/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fadeIn">
      <div className={`bg-surface h-full shadow-elevation-2 flex flex-col border-l border-border animate-slideLeft transition-all duration-200 ${
        isMaximized ? "w-full max-w-none" : "w-full max-w-2xl"
      }`}>
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                {quotation.quotationNumber}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(
                  quotation.status
                )}`}
              >
                {quotation.status}
              </span>
              {isExpired && quotation.status !== "EXPIRED" && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning-tint text-warning">
                  EXPIRED
                </span>
              )}
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">
              {quotation.customer?.displayName || "Commercial Quotation"}
            </h2>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Status Bar & Action Banner */}
          {quotation.status === "ACCEPTED" && (
            <div className="p-4 rounded-md bg-success-tint/60 border border-success/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-body font-semibold text-success leading-tight">
                    Quotation Accepted by Client
                  </p>
                  <p className="text-caption text-success/80">
                    Ready to convert into a confirmed Sales Order for fulfillment.
                  </p>
                </div>
              </div>
              <button
                onClick={handleConvertToOrder}
                disabled={converting}
                className="px-4 py-2 text-body font-semibold rounded-sm bg-success text-white hover:bg-success/90 shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50 transition-all"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert to Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {quotation.status === "CONVERTED" && quotation.salesOrder && (
            <div className="p-4 rounded-md bg-purple-tint/60 border border-purple/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-purple" />
                <div>
                  <p className="text-body font-semibold text-purple leading-tight">
                    Converted to Sales Order
                  </p>
                  <p className="text-caption text-purple/80 font-mono">
                    Order Ref: #{quotation.salesOrder.orderNumber}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Customer Details
              </span>
              <p className="text-body font-semibold text-ink">
                {quotation.customer?.displayName || "N/A"}
              </p>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>{quotation.customer?.phone || "No phone registered"}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Branch & Validity
              </span>
              <div className="flex items-center gap-1.5 text-body font-semibold text-ink">
                <Building2 className="w-3.5 h-3.5 text-purple" />
                <span>{quotation.branch?.name || "Head Office"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                <Calendar className="w-3.5 h-3.5 text-warning" />
                <span>Expires: {new Date(quotation.validUntil).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-caption font-semibold uppercase tracking-wider text-ink">
                Itemized Scope & Pricing ({quotation.lines.length} items)
              </h3>
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left text-body">
                <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center w-20">Qty</th>
                    <th className="py-2 px-3 text-right w-28">Unit (৳)</th>
                    <th className="py-2 px-3 text-right w-28">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quotation.lines.map((item, idx) => (
                    <tr key={idx} className="hover:bg-page-bg/30">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-ink">{item.description}</p>
                        {item.product && (
                          <span className="text-[11px] text-text-muted font-mono">
                            SKU: {item.product.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                        ৳{item.unitPrice.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                        ৳{item.lineTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 p-3 rounded-sm bg-page-bg border border-border space-y-1.5 text-body">
                <div className="flex items-center justify-between text-caption text-text-muted">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    ৳{quotation.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-caption text-text-muted">
                  <span>VAT & Tax:</span>
                  <span className="font-mono">৳0.00</span>
                </div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between font-bold text-h3 text-ink">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">
                    ৳{quotation.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border bg-page-bg/40 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-body rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>

          <div className="flex items-center gap-2">
            {quotation.status === "DRAFT" && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange("SENT")}
                className="px-3.5 py-2 text-body font-medium rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Mark as Sent</span>
              </button>
            )}

            {quotation.status === "SENT" && (
              <>
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("REJECTED")}
                  className="px-3 py-2 text-body font-medium rounded-sm border border-danger/30 text-danger hover:bg-danger-tint flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("ACCEPTED")}
                  className="px-3.5 py-2 text-body font-medium rounded-sm bg-success text-white hover:bg-success/90 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Client Accepted</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 text-body rounded-sm border border-border bg-surface text-ink hover:bg-page-bg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
