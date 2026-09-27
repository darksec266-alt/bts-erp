"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  Calendar,
  Phone,
  Truck,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
} from "lucide-react";
import { api } from "../../lib/api";
import type { SalesOrderDto, DeliveryChallanDto, ProductDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface SalesOrderDetailDrawerProps {
  order: SalesOrderDto | null;
  isOpen: boolean;
  onClose: () => void;
  onChallanDispatched: (challan: DeliveryChallanDto) => void;
  onCreateInvoice?: (order: SalesOrderDto) => void;
  products?: ProductDto[];
}

export const SalesOrderDetailDrawer: React.FC<SalesOrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onChallanDispatched,
  onCreateInvoice,
  products = [],
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [dispatching, setDispatching] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [challanNumber, setChallanNumber] = useState(
    () => `DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [dispatchLines, setDispatchLines] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Sales Order: ${order.orderNumber}`}
        icon={<Building2 className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleOpenDispatch = () => {
    // Default to dispatching all order lines with full quantity
    const initial: Record<string, number> = {};
    order.lines.forEach((l) => {
      if (l.id) initial[l.id] = l.quantity;
    });
    setDispatchLines(initial);
    setShowDispatchForm(true);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setError(null);

    try {
      const itemsToDispatch = order.lines
        .filter((l) => l.id && (dispatchLines[l.id] || 0) > 0)
        .map((l) => ({
          salesOrderLineId: l.id!,
          productId: l.productId || l.id!,
          quantity: dispatchLines[l.id!] || l.quantity,
        }));

      if (itemsToDispatch.length === 0) {
        setError("Please specify quantity to dispatch for at least one item.");
        setDispatching(false);
        return;
      }

      const challan = await api.createDeliveryChallan(order.id, {
        challanNumber: challanNumber.trim() || undefined,
        lines: itemsToDispatch,
      });

      onChallanDispatched(challan);
      setShowDispatchForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch delivery challan.");
    } finally {
      setDispatching(false);
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
                {order.orderNumber}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-tint text-success border border-success/20">
                CONFIRMED
              </span>
              {order.quotation && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-tint text-purple font-mono">
                  From {order.quotation.quotationNumber}
                </span>
              )}
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">
              {order.customer?.displayName || "Sales Order Details"}
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

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Customer Information
              </span>
              <p className="text-body font-semibold text-ink">
                {order.customer?.displayName || "N/A"}
              </p>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>{order.customer?.phone || "No phone registered"}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Branch & Date
              </span>
              <div className="flex items-center gap-1.5 text-body font-semibold text-ink">
                <Building2 className="w-3.5 h-3.5 text-purple" />
                <span>{order.branch?.name || "Head Office"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1">
                <Calendar className="w-3.5 h-3.5 text-warning" />
                <span>Order Placed: {new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Dispatch Challan Form Inline */}
          {showDispatchForm && (
            <div className="p-4 rounded-md border border-primary/30 bg-primary-tint/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h4 className="text-body font-bold text-ink">Dispatch Delivery Challan</h4>
                </div>
                <button
                  onClick={() => setShowDispatchForm(false)}
                  className="text-text-muted hover:text-ink text-caption"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink mb-1">
                    Challan Number
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-caption rounded-sm border border-border bg-surface text-ink font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                  Items to dispatch
                </span>
                <div className="divide-y divide-border border border-border rounded-sm bg-surface">
                  {order.lines.map((l) => {
                    const matchedProd = products.find((p) => p.id === l.productId);
                    const onHandStock = matchedProd?.totalStock;

                    return (
                      <div key={l.id} className="p-2.5 flex items-center justify-between text-caption">
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{l.description}</p>
                            {(l.product?.sku || matchedProd?.sku) && (
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-page-bg text-text-muted border border-border">
                                {l.product?.sku || matchedProd?.sku}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                            <span>Ordered Qty: {l.quantity}</span>
                            {onHandStock !== undefined && (
                              <span
                                className={`font-semibold ${
                                  onHandStock > 0 ? "text-success" : "text-danger"
                                }`}
                              >
                                • Stock Available: {onHandStock} {matchedProd?.unit?.code || "units"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">Ship Qty:</span>
                          <input
                            type="number"
                            min="1"
                            max={l.quantity}
                            value={l.id ? dispatchLines[l.id] || 0 : 0}
                            onChange={(e) => {
                              if (l.id) {
                                const val = Math.min(l.quantity, Math.max(0, Number(e.target.value)));
                                setDispatchLines((prev) => ({ ...prev, [l.id!]: val }));
                              }
                            }}
                            className="w-16 px-2 py-1 text-center font-mono rounded border border-border text-ink bg-page-bg outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDispatchSubmit}
                  disabled={dispatching}
                  className="px-4 py-2 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {dispatching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Challan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-2">
            <h3 className="text-caption font-semibold uppercase tracking-wider text-ink">
              Purchased Line Items ({order.lines.length} items)
            </h3>

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
                  {order.lines.map((item, idx) => (
                    <tr key={idx} className="hover:bg-page-bg/30">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-ink">{item.description}</p>
                        {(() => {
                          const sku =
                            item.product?.sku ||
                            (item.productId && products.find((p) => p.id === item.productId)?.sku);
                          return sku ? (
                            <span className="text-[11px] text-text-muted font-mono">
                              SKU: {sku}
                            </span>
                          ) : null;
                        })()}
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
                <div className="border-t border-border pt-1.5 flex items-center justify-between font-bold text-h3 text-ink">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">
                    ৳{order.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Challans History */}
          <div className="space-y-2">
            <h3 className="text-caption font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" />
              <span>Associated Delivery Challans ({(order.challans || []).length})</span>
            </h3>

            {(!order.challans || order.challans.length === 0) ? (
              <div className="p-4 rounded-sm border border-border bg-page-bg/40 text-caption text-text-muted flex items-center justify-between">
                <span>No delivery challans dispatched yet for this order.</span>
                {!showDispatchForm && (
                  <button
                    onClick={handleOpenDispatch}
                    className="px-2.5 py-1 text-caption font-medium rounded-sm border border-primary/30 text-primary hover:bg-primary-tint transition-colors"
                  >
                    + Dispatch Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="divide-y divide-border border border-border rounded-sm overflow-hidden">
                  {order.challans.map((ch) => {
                    const isBilled = ch.billingStatus === "BILLED" || ch.invoiceId != null;
                    return (
                      <div key={ch.id} className="p-3 flex items-center justify-between text-body bg-surface hover:bg-page-bg/30">
                        <div className="flex items-center gap-2.5">
                          <Truck className="w-4 h-4 text-primary" />
                          <div>
                            <span className="font-mono font-bold text-ink">{ch.challanNumber}</span>
                            <span className="text-[11px] text-text-muted block">
                              Dispatched: {new Date(ch.dispatchedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isBilled ? (
                            <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20">
                              BILLED
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-warning px-2 py-0.5 rounded-full bg-warning-tint border border-warning/20">
                              UNBILLED (Pending Bill)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* If order has unbilled challans, prompt button to consolidate bill */}
                {order.challans.some((c) => c.billingStatus !== "BILLED" && !c.invoiceId) && onCreateInvoice && (
                  <div className="p-3 rounded-sm bg-primary-tint/20 border border-primary/20 flex items-center justify-between text-caption">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium text-ink">
                        You have unbilled delivery challans on this order.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCreateInvoice(order);
                      }}
                      className="px-3 py-1 font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
                    >
                      Generate Commercial Bill
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border bg-page-bg/40 flex items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-body rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>

          <div className="flex items-center gap-2">
            {order.challans &&
              order.challans.some((c) => c.billingStatus !== "BILLED" && !c.invoiceId) &&
              onCreateInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateInvoice(order);
                  }}
                  className="px-3.5 py-2 text-body font-semibold rounded-sm border border-primary text-primary hover:bg-primary-tint flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Create Bill</span>
                </button>
              )}

            {!showDispatchForm && (
              <button
                onClick={handleOpenDispatch}
                className="px-4 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch Challan</span>
              </button>
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
