"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Building2,
  Calendar,
  Phone,
  Truck,
  Layers,
  MapPin,
} from "lucide-react";
import type { InvoiceDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface InvoiceDetailDrawerProps {
  invoice: InvoiceDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !invoice) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Invoice: ${invoice.invoiceNumber}`}
        icon={<Building2 className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fadeIn">
      <div className={`bg-surface h-full shadow-elevation-2 flex flex-col border-l border-border animate-slideLeft transition-all duration-200 ${
        isMaximized ? "w-full max-w-none" : "w-full max-w-2xl"
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                {invoice.invoiceNumber}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-tint text-success border border-success/20">
                {invoice.status}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-tint text-purple">
                Commercial Bill
              </span>
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">
              {invoice.customer?.displayName || "Commercial Invoice"}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar print:p-0">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Billed To (Client)
              </span>
              <p className="text-body font-semibold text-ink">
                {invoice.customer?.displayName || "N/A"}
              </p>
              {invoice.customer?.customerCode && (
                <span className="text-[11px] text-text-muted font-mono block">
                  Code: {invoice.customer.customerCode}
                </span>
              )}
              {invoice.customer?.phone && (
                <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{invoice.customer.phone}</span>
                </div>
              )}
              {invoice.customer?.address && (
                <div className="flex items-center gap-1.5 text-caption text-text-muted mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" />
                  <span>{invoice.customer.address}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Billing Details
              </span>
              <div className="flex items-center gap-1.5 text-body font-semibold text-ink">
                <Building2 className="w-3.5 h-3.5 text-purple" />
                <span>{invoice.branch?.name || "Corporate Head Office"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span>Billed On: {new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-0.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Consolidated Challans: {(invoice.challans || []).length}</span>
              </div>
            </div>
          </div>

          {/* Included Delivery Challans */}
          <div className="space-y-2">
            <h3 className="text-caption font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" />
              <span>Covered Delivery Challans ({(invoice.challans || []).length})</span>
            </h3>

            {(!invoice.challans || invoice.challans.length === 0) ? (
              <div className="p-3 rounded-sm border border-border bg-page-bg/40 text-caption text-text-muted">
                No delivery challans directly linked.
              </div>
            ) : (
              <div className="border border-border rounded-sm divide-y divide-border overflow-hidden">
                {invoice.challans.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 bg-surface hover:bg-page-bg/30 flex items-center justify-between text-body"
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-primary" />
                      <div>
                        <span className="font-mono font-bold text-ink">{ch.challanNumber}</span>
                        <span className="text-[11px] text-text-muted block">
                          Dispatched: {new Date(ch.dispatchedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20">
                        BILLED
                      </span>
                      <span className="text-[11px] text-text-muted block mt-0.5 font-mono">
                        {ch.lines.length} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-2">
            <h3 className="text-caption font-semibold uppercase tracking-wider text-ink">
              Commercial Bill Line Items
            </h3>

            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left text-body">
                <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center w-24">Delivered Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price (৳)</th>
                    <th className="py-2.5 px-3 text-right w-32">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.lines && invoice.lines.length > 0 ? (
                    invoice.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-page-bg/30">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-ink">{line.productName || "Product"}</p>
                          {line.sku && (
                            <span className="text-[11px] text-text-muted font-mono">
                              SKU: {line.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-ink">
                          {line.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                          ৳{line.unitPrice.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                          ৳{line.lineTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-caption text-text-muted">
                        Consolidated from included delivery challans.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-72 p-3.5 rounded-sm bg-page-bg border border-border space-y-2 text-body">
                <div className="flex items-center justify-between text-caption text-text-muted">
                  <span>Challans Included:</span>
                  <span className="font-mono font-semibold text-ink">{(invoice.challans || []).length}</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between font-bold text-h3 text-ink">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">
                    ৳{invoice.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-page-bg/40 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-body font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink flex items-center gap-1.5 transition-colors shadow-elevation-1"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Commercial Bill</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-body rounded-sm border border-border bg-surface text-ink hover:bg-page-bg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
