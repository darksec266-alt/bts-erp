"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileCheck,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  CheckSquare,
  Square,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  SalesOrderDto,
  DeliveryChallanDto,
  InvoiceDto,
} from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: InvoiceDto) => void;
  orders: SalesOrderDto[];
  preSelectedOrderId?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orders,
  preSelectedOrderId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preSelectedOrderId || ""
  );
  const [loadingChallans, setLoadingChallans] = useState(false);
  const [unbilledChallans, setUnbilledChallans] = useState<DeliveryChallanDto[]>([]);
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authorized VAT & Tax controls (Section 17, 18, 26)
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState<number>(15);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Update order selection when preSelectedOrderId changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const orderId = preSelectedOrderId || (orders.length > 0 ? orders[0].id : "");
      setSelectedOrderId(orderId);
      setInvoiceNumber(
        `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      );
      setError(null);
    }
  }, [isOpen, preSelectedOrderId, orders]);

  // Load unbilled challans whenever selectedOrderId changes
  useEffect(() => {
    if (!selectedOrderId) {
      setUnbilledChallans([]);
      setSelectedChallanIds([]);
      return;
    }

    let isMounted = true;
    setLoadingChallans(true);
    setError(null);

    api
      .getDeliveryChallans({
        salesOrderId: selectedOrderId,
        billingStatus: "UNBILLED",
      })
      .then((res) => {
        if (!isMounted) return;
        setUnbilledChallans(res.items);
        // By default, select all unbilled challans for convenience
        setSelectedChallanIds(res.items.map((c) => c.id));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load challans.");
      })
      .finally(() => {
        if (isMounted) setLoadingChallans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrderId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Invoice (${invoiceNumber})`}
        icon={<FileCheck className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  // Toggle single challan selection
  const handleToggleChallan = (id: string) => {
    setSelectedChallanIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedChallanIds.length === unbilledChallans.length) {
      setSelectedChallanIds([]);
    } else {
      setSelectedChallanIds(unbilledChallans.map((c) => c.id));
    }
  };

  // Calculate live preview totals based on selected challans and order lines
  const orderLinePriceMap = new Map<string, number>();
  if (currentOrder) {
    currentOrder.lines.forEach((l) => {
      if (l.id) orderLinePriceMap.set(l.id, l.unitPrice);
    });
  }

  // Aggregate selected items
  const aggregatedItemsMap = new Map<
    string,
    { name: string; sku: string; qty: number; unitPrice: number; total: number }
  >();

  const selectedChallanObjects = unbilledChallans.filter((c) =>
    selectedChallanIds.includes(c.id)
  );

  selectedChallanObjects.forEach((ch) => {
    ch.lines.forEach((line) => {
      const unitPrice = orderLinePriceMap.get(line.salesOrderLineId) || 0;
      const key = line.productId || line.salesOrderLineId;
      const qty = Number(line.quantity);

      if (aggregatedItemsMap.has(key)) {
        const item = aggregatedItemsMap.get(key)!;
        item.qty += qty;
        item.total = Number((item.qty * item.unitPrice).toFixed(2));
      } else {
        aggregatedItemsMap.set(key, {
          name: line.product?.name || "Product Item",
          sku: line.product?.sku || "SKU-N/A",
          qty,
          unitPrice,
          total: Number((qty * unitPrice).toFixed(2)),
        });
      }
    });
  });

  const previewItems = Array.from(aggregatedItemsMap.values());
  const subtotal = previewItems.reduce((acc, curr) => acc + curr.total, 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatAmount = vatEnabled ? Math.round(taxableAmount * (vatRate / 100) * 100) / 100 : 0;
  const calculatedGrandTotal = taxableAmount + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setError("Please select a Sales Order / Project.");
      return;
    }
    if (selectedChallanIds.length === 0) {
      setError("Please select at least one unbilled Delivery Challan.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const invoice = await api.createInvoiceFromChallans(selectedOrderId, {
        challanIds: selectedChallanIds,
        invoiceNumber: invoiceNumber.trim() || undefined,
      });

      onSuccess(invoice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${isMaximized ? "p-0" : "p-4"}`}>
      <div className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0" : "relative w-full max-w-3xl rounded-md max-h-[90vh] my-8"
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-bold text-ink leading-tight">
                Create Consolidated Bill / Invoice
              </h2>
              <p className="text-caption text-text-muted">
                Consolidate multiple or single delivery challans into one official commercial bill
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project / Sales Order Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold uppercase tracking-wider text-ink mb-1.5">
                Sales Order / Project *
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink hover:border-primary/50 focus:border-primary outline-none transition-colors"
              >
                <option value="">-- Select Confirmed Sales Order --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.customer?.displayName || "N/A"} (৳{o.grandTotal.toLocaleString("en-BD")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold uppercase tracking-wider text-ink mb-1.5">
                Commercial Invoice # *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-1001"
                required
                disabled={submitting}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-surface text-ink hover:border-primary/50 focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Order Context Card */}
          {currentOrder && (
            <div className="p-3.5 rounded-sm bg-page-bg border border-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-caption">
              <div>
                <span className="text-text-muted block font-medium">Customer:</span>
                <span className="font-semibold text-ink">{currentOrder.customer?.displayName}</span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Branch:</span>
                <span className="font-semibold text-ink">{currentOrder.branch?.name || "Head Office"}</span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Total Order Value:</span>
                <span className="font-mono font-bold text-primary">
                  ৳{currentOrder.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Unbilled Challans Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-body font-bold text-ink flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Select Unbilled Delivery Challans</span>
                </h3>
                <p className="text-caption text-text-muted">
                  Choose which challans to include in this invoice. Selected challans will be marked as BILLED.
                </p>
              </div>

              {unbilledChallans.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink flex items-center gap-1.5 transition-colors"
                >
                  {selectedChallanIds.length === unbilledChallans.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-text-muted" />
                      <span>Select All ({unbilledChallans.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {loadingChallans ? (
              <div className="p-8 text-center border border-border rounded-sm bg-page-bg/30 space-y-2">
                <Loader2 className="w-6 h-6 mx-auto text-primary animate-spin" />
                <p className="text-caption text-text-muted">Fetching unbilled challans...</p>
              </div>
            ) : unbilledChallans.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-sm bg-page-bg/30 space-y-2">
                <Package className="w-8 h-8 mx-auto text-text-muted/40" />
                <p className="text-body font-semibold text-ink">No Unbilled Challans Available</p>
                <p className="text-caption text-text-muted max-w-md mx-auto">
                  {selectedOrderId
                    ? "All dispatched challans for this order have already been billed into invoices, or no challan has been created yet. Please dispatch a new challan first."
                    : "Please select a sales order above to view its unbilled delivery challans."}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
                {unbilledChallans.map((ch) => {
                  const isSelected = selectedChallanIds.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleToggleChallan(ch.id)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? "bg-primary-tint/20 border-l-4 border-l-primary" : "bg-surface hover:bg-page-bg/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleChallan(ch.id)}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-ink text-body">
                              {ch.challanNumber}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-warning-tint text-warning border border-warning/20">
                              UNBILLED
                            </span>
                          </div>
                          <span className="text-caption text-text-muted block mt-0.5">
                            Dispatched: {new Date(ch.dispatchedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-body font-mono font-medium text-ink block">
                          {ch.lines.length} {ch.lines.length === 1 ? "Product" : "Products"} Dispatched
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {ch.lines.map((l) => `${l.quantity}x ${l.product?.name || "Item"}`).join(", ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aggregated Bill Preview */}
          {selectedChallanIds.length > 0 && previewItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-caption font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-success" />
                <span>Consolidated Bill Preview ({selectedChallanIds.length} Challans Selected)</span>
              </h3>

              <div className="border border-border rounded-sm overflow-hidden">
                <table className="w-full text-left text-body">
                  <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="py-2 px-3">Item / Description</th>
                      <th className="py-2 px-3 text-center w-24">Delivered Qty</th>
                      <th className="py-2 px-3 text-right w-28">Unit Price (৳)</th>
                      <th className="py-2 px-3 text-right w-32">Line Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-page-bg/30">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-ink text-body">{item.name}</p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-tint text-primary border border-primary/20">
                              <ShieldCheck className="w-3 h-3" />
                              Warranty Eligible
                            </span>
                          </div>
                          <span className="text-[11px] text-text-muted font-mono">
                            SKU: {item.sku}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-ink">
                          {item.qty}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-text-muted">
                          ৳{item.unitPrice.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-ink">
                          ৳{item.total.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VAT & Tax Calculation Breakdown Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* VAT & Discount Controls */}
                <div className="p-3.5 rounded-sm bg-page-bg/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-caption font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-primary" />
                      Apply Sales VAT
                    </label>
                    <button
                      type="button"
                      onClick={() => setVatEnabled(!vatEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        vatEnabled ? "bg-primary" : "bg-border"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          vatEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {vatEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          VAT Rate (%)
                        </label>
                        <select
                          value={vatRate}
                          onChange={(e) => setVatRate(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink text-sm outline-none"
                        >
                          <option value={0}>0% (Zero-Rated / Exempt)</option>
                          <option value={5}>5% (Reduced Rate)</option>
                          <option value={7.5}>7.5% (Standard Service)</option>
                          <option value={10}>10% (Special Rate)</option>
                          <option value={15}>15% (Standard VAT)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          VAT Treatment
                        </label>
                        <input
                          type="text"
                          readOnly
                          value="Standard Output VAT"
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-text-muted text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-text-muted mb-1">
                      Discount (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-3.5 rounded-sm bg-page-bg border border-border space-y-2">
                  <div className="flex items-center justify-between text-body text-text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-ink">
                      ৳{subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-body text-danger">
                      <span>Discount:</span>
                      <span className="font-mono font-medium">
                        -৳{discountAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-body text-text-muted">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-medium text-ink">
                      ৳{taxableAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-body text-text-muted">
                    <span>Sales VAT ({vatEnabled ? `${vatRate}%` : "0% OFF"}):</span>
                    <span className="font-mono font-medium text-ink">
                      ৳{vatAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-border pt-2 flex items-center justify-between font-bold text-h3 text-ink">
                    <span>Invoice Grand Total:</span>
                    <span className="font-mono text-primary text-xl">
                      ৳{calculatedGrandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-body rounded-sm border border-border bg-surface text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedChallanIds.length === 0}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Bill...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Generate Invoice (৳{calculatedGrandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
