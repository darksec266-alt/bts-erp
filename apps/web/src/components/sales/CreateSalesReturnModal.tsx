"use client";

import React, { useState, useEffect } from "react";
import {
  Undo2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Package,
  Layers,
  Wallet,
  Receipt,
  RotateCcw,
  Check,
} from "lucide-react";
import { api } from "../../lib/api";
import type { InvoiceDto, WarehouseDto, CreateSalesReturnRequest } from "@bts/shared-types";

interface ReturnableItem {
  productId: string;
  productName: string;
  sku: string;
  trackingType: "SERIALIZED" | "NON_SERIALIZED";
  invoicedQuantity: number;
  alreadyReturnedQuantity: number;
  returnableQuantity: number;
  unitPrice: number;
  soldSerials: string[];
}

interface ReturnLineState {
  quantity: number;
  selectedSerials: string[];
}

interface CreateSalesReturnModalProps {
  invoice: InvoiceDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSalesReturnModal: React.FC<CreateSalesReturnModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  const [lineStates, setLineStates] = useState<Record<string, ReturnLineState>>({});
  const [creditToWallet, setCreditToWallet] = useState<boolean>(true);
  const [reason, setReason] = useState<string>("");
  const [financials, setFinancials] = useState<{
    grandTotal: number;
    totalPaid: number;
    alreadyReturnedAmount: number;
    currentDue: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !invoice) {
      setReturnableItems([]);
      setLineStates({});
      setFinancials(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getInvoiceReturnableItems(invoice.id),
      api.getWarehouses(),
    ])
      .then(([retRes, whRes]) => {
        if (!isMounted) return;
        setReturnableItems(retRes.items || []);
        setFinancials(retRes.financials || null);
        
        // Initialize line states
        const initialStates: Record<string, ReturnLineState> = {};
        for (const item of retRes.items || []) {
          initialStates[item.productId] = {
            quantity: 0,
            selectedSerials: [],
          };
        }
        setLineStates(initialStates);

        const whs = whRes.items || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          // Select warehouse matching branch or default to first
          const matching = whs.find((w) => w.branchId === invoice.branchId) || whs[0];
          setSelectedWarehouseId(matching.id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load invoice items for return.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handleQuantityChange = (productId: string, qty: number, item: ReturnableItem) => {
    const validQty = Math.max(0, Math.min(qty, item.returnableQuantity));
    setLineStates((prev) => {
      const current = prev[productId] || { quantity: 0, selectedSerials: [] };
      let newSerials = current.selectedSerials;
      if (item.trackingType === "SERIALIZED" && newSerials.length > validQty) {
        newSerials = newSerials.slice(0, validQty);
      }
      return {
        ...prev,
        [productId]: {
          quantity: validQty,
          selectedSerials: newSerials,
        },
      };
    });
  };

  const handleToggleSerial = (productId: string, serial: string, requiredCount: number) => {
    setLineStates((prev) => {
      const current = prev[productId] || { quantity: 0, selectedSerials: [] };
      const exists = current.selectedSerials.includes(serial);
      let updated: string[];
      if (exists) {
        updated = current.selectedSerials.filter((s) => s !== serial);
      } else {
        if (current.selectedSerials.length >= requiredCount) {
          // Replace last or don't add
          return prev;
        }
        updated = [...current.selectedSerials, serial];
      }
      return {
        ...prev,
        [productId]: {
          ...current,
          selectedSerials: updated,
        },
      };
    });
  };

  // Financial computations
  const grandTotal = financials ? financials.grandTotal : Number(invoice.grandTotal);
  const totalPaid = financials
    ? financials.totalPaid
    : (invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const currentDue = financials
    ? financials.currentDue
    : Math.max(0, grandTotal - totalPaid);
  const isDueBill = currentDue > 0;

  // Compute totals
  const activeReturnLines = returnableItems
    .map((item) => {
      const state = lineStates[item.productId] || { quantity: 0, selectedSerials: [] };
      return {
        item,
        quantity: state.quantity,
        selectedSerials: state.selectedSerials,
        lineTotal: Number((state.quantity * item.unitPrice).toFixed(2)),
      };
    })
    .filter((l) => l.quantity > 0);

  const totalReturnAmount = Number(
    activeReturnLines.reduce((acc, l) => acc + l.lineTotal, 0).toFixed(2)
  );

  // User requirement: "JODI KONO CUSTOMER DUE BILL KORE TAHOLE TA RETURN KORLE KOKKHONOI WALLET A ADD HOBE NA. TA CURRENT DUE THEKE BAD JABE."
  // 1. Amount deducted from due
  const dueDeduction = Number(Math.min(totalReturnAmount, currentDue).toFixed(2));
  // 2. Excess refund (only if customer paid cash exceeding the remaining bill)
  const excessPaidRefund = Number(Math.max(0, totalReturnAmount - dueDeduction).toFixed(2));
  // 3. Wallet credit amount
  const walletCreditAmount = creditToWallet ? excessPaidRefund : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedWarehouseId) {
      setError("Please select a receiving warehouse to restock the returned inventory.");
      return;
    }

    if (activeReturnLines.length === 0) {
      setError("Please specify a return quantity of at least 1 item.");
      return;
    }

    // Validate serials for serialized items
    for (const line of activeReturnLines) {
      if (line.item.trackingType === "SERIALIZED") {
        if (line.selectedSerials.length !== line.quantity) {
          setError(
            `"${line.item.productName}" requires exactly ${line.quantity} serial number(s) to be selected (currently selected: ${line.selectedSerials.length}).`
          );
          return;
        }
      }
    }

    const payload: CreateSalesReturnRequest = {
      invoiceId: invoice.id,
      warehouseId: selectedWarehouseId,
      reason: reason.trim() || undefined,
      creditToWallet,
      lines: activeReturnLines.map((l) => ({
        productId: l.item.productId,
        quantity: l.quantity,
        unitPrice: l.item.unitPrice,
        serials: l.item.trackingType === "SERIALIZED" ? l.selectedSerials : undefined,
      })),
    };

    setSubmitting(true);
    try {
      await api.createSalesReturn(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process sales return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface rounded-md border border-border shadow-elevation-4 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-page-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-warning-tint text-warning border border-warning/20">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h3 font-bold text-ink leading-tight flex items-center gap-2">
                <span>Process Sales Return</span>
                <span className="text-caption font-mono font-medium px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  #{invoice.invoiceNumber}
                </span>
              </h2>
              <p className="text-caption text-text-muted">
                {isDueBill
                  ? "Return goods to inventory and automatically offset outstanding due balance."
                  : "Return goods to inventory and automatically credit customer wallet."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-danger-tint border border-danger/20 rounded text-danger text-body flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Invoice Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3.5 rounded-md border border-border bg-page-bg/30">
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Customer
              </span>
              <p className="text-body font-bold text-ink truncate mt-0.5">
                {invoice.customer?.displayName || "N/A"}
              </p>
              <span className="text-caption font-mono text-text-muted">
                {invoice.customer?.phone || ""}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Branch
              </span>
              <p className="text-body font-semibold text-ink mt-0.5">
                {invoice.branch?.name || "Head Office"}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Invoice Total
              </span>
              <p className="text-body font-mono font-bold text-ink mt-0.5">
                ৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-text-muted">
                Paid: ৳{totalPaid.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Current Due
              </span>
              <p className={`text-body font-mono font-bold mt-0.5 ${currentDue > 0 ? "text-danger" : "text-success"}`}>
                ৳{currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded inline-block mt-0.5 ${currentDue > 0 ? "bg-danger-tint text-danger" : "bg-success-tint text-success"}`}>
                {currentDue > 0 ? "Outstanding" : "Fully Paid"}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                Restock Warehouse *
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Returnable Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-body font-bold text-ink flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <span>Invoice Line Items Available for Return</span>
              </h3>
              <span className="text-caption text-text-muted">
                Specify quantities to return to inventory
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-text-muted">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-body">Loading invoice line items and serials...</p>
              </div>
            ) : returnableItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-md text-text-muted">
                <p className="text-body font-medium">All items on this invoice have already been returned.</p>
              </div>
            ) : (
              <div className="border border-border rounded-md overflow-hidden bg-surface">
                <table className="w-full text-left text-body">
                  <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-center">Invoiced Qty</th>
                      <th className="py-2.5 px-3 text-center">Already Ret.</th>
                      <th className="py-2.5 px-3 text-center">Available</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (৳)</th>
                      <th className="py-2.5 px-3 text-center w-28">Return Qty</th>
                      <th className="py-2.5 px-3 text-right">Line Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {returnableItems.map((item) => {
                      const state = lineStates[item.productId] || { quantity: 0, selectedSerials: [] };
                      const lineRefund = Number((state.quantity * item.unitPrice).toFixed(2));
                      const isSerialized = item.trackingType === "SERIALIZED";
                      const isExhausted = item.returnableQuantity <= 0;

                      return (
                        <React.Fragment key={item.productId}>
                          <tr
                            className={`transition-colors ${
                              state.quantity > 0 ? "bg-primary-tint/30" : "hover:bg-page-bg/40"
                            } ${isExhausted ? "opacity-60 bg-page-bg/20" : ""}`}
                          >
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-ink leading-tight">{item.productName}</p>
                              <span className="text-[11px] font-mono text-text-muted">{item.sku}</span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  isSerialized
                                    ? "bg-purple-tint text-purple border-purple/20"
                                    : "bg-surface text-text-muted border-border"
                                }`}
                              >
                                {isSerialized ? "SERIALIZED" : "BULK"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-medium">
                              {item.invoicedQuantity}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono text-text-muted">
                              {item.alreadyReturnedQuantity}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-success">
                              {item.returnableQuantity}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono">
                              ৳{item.unitPrice.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={item.returnableQuantity}
                                disabled={isExhausted}
                                value={state.quantity || ""}
                                placeholder="0"
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.productId,
                                    parseInt(e.target.value) || 0,
                                    item
                                  )
                                }
                                className="w-20 px-2 py-1 text-center font-mono font-bold rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden disabled:bg-page-bg/50"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                              ৳{lineRefund.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {/* Serial selection row if serialized item has quantity > 0 */}
                          {isSerialized && state.quantity > 0 && (
                            <tr className="bg-purple-tint/15 border-b border-purple/20">
                              <td colSpan={8} className="py-3 px-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-caption font-semibold text-purple flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5" />
                                      <span>
                                        Select Sold Serials to Return (Selected: {state.selectedSerials.length} of {state.quantity} required)
                                      </span>
                                    </span>
                                    {state.selectedSerials.length === state.quantity && (
                                      <span className="text-[11px] font-semibold text-success flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Serials matched</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {item.soldSerials.length === 0 ? (
                                      <p className="text-caption text-text-muted italic">
                                        No serialized units found on this invoice.
                                      </p>
                                    ) : (
                                      item.soldSerials.map((serial) => {
                                        const isSelected = state.selectedSerials.includes(serial);
                                        return (
                                          <button
                                            type="button"
                                            key={serial}
                                            onClick={() =>
                                              handleToggleSerial(item.productId, serial, state.quantity)
                                            }
                                            className={`px-2.5 py-1 text-caption font-mono rounded border transition-all flex items-center gap-1.5 ${
                                              isSelected
                                                ? "bg-purple text-white border-purple font-semibold shadow-xs"
                                                : "bg-surface hover:bg-page-bg text-ink border-border"
                                            }`}
                                          >
                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            <span>{serial}</span>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Refund & Due Adjustment Settings */}
          <div className="p-4 rounded-md border border-border bg-page-bg/40 space-y-4">
            {/* If Invoice has Due */}
            {isDueBill ? (
              <div className="p-3.5 rounded border border-amber-300/80 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/50 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-body font-bold text-amber-900 dark:text-amber-300">
                      Due Bill Return Policy (বকেয়া বিল সমন্বয়)
                    </h4>
                    <p className="text-caption text-amber-800 dark:text-amber-400 leading-relaxed">
                      এই ইনভয়েসের বকেয়া <strong>৳{currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>। 
                      নিয়ম অনুযায়ী রিটার্নের টাকা <strong>কখনোই ওয়ালেটে যোগ হবে না</strong>, তা সরাসরি বর্তমান বাকি থেকে বাদ যাবে।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/80 dark:border-amber-800/40">
                  <div className="bg-surface p-2.5 rounded border border-border">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                      Total Return Value
                    </span>
                    <p className="text-h3 font-mono font-bold text-ink mt-0.5">
                      ৳{totalReturnAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-surface p-2.5 rounded border border-amber-300/80 dark:border-amber-800/60">
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                      Deducted from Due
                    </span>
                    <p className="text-h3 font-mono font-bold text-amber-600 mt-0.5">
                      -৳{dueDeduction.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-text-muted">
                      New Due: ৳{Math.max(0, currentDue - dueDeduction).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-surface p-2.5 rounded border border-border">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                      Wallet Credit (ওয়ালেটে জমা)
                    </span>
                    <p className={`text-h3 font-mono font-bold mt-0.5 ${walletCreditAmount > 0 ? "text-emerald-600" : "text-text-muted"}`}>
                      ৳{walletCreditAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-text-muted">
                      {excessPaidRefund > 0
                        ? `Excess paid refund credited`
                        : `৳0 (No wallet credit)`}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-body font-bold text-emerald-900 dark:text-emerald-300">
                      Fully Paid Invoice (পরিশোধিত বিল)
                    </span>
                    <p className="text-caption text-emerald-800 dark:text-emerald-400 mt-0.5">
                      ইনভয়েসটিতে কোনো বকেয়া নেই। সম্পূর্ণ রিটার্ন মূল্য গ্রাহকের ওয়ালেটে সরাসরি যোগ হবে।
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800/40 sm:pl-6 shrink-0">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                    Wallet Credit
                  </span>
                  <p className="text-h2 font-mono font-bold text-emerald-600">
                    ৳{totalReturnAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* Wallet Credit Toggle for excess/paid refunds */}
            {excessPaidRefund > 0 && (
              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={creditToWallet}
                  onChange={(e) => setCreditToWallet(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary border-border focus:ring-primary"
                />
                <div>
                  <span className="text-body font-bold text-ink flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Credit Excess Paid Amount to Customer Wallet</span>
                  </span>
                  <p className="text-caption text-text-muted mt-0.5">
                    ৳{excessPaidRefund.toLocaleString("en-BD", { minimumFractionDigits: 2 })} will be credited to {invoice.customer?.displayName || "customer"}&apos;s wallet balance.
                  </p>
                </div>
              </label>
            )}

            <div>
              <label className="text-caption font-semibold text-text-muted block mb-1">
                Return Reason / Notes
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer returned goods / transit defect / wrong item delivered"
                className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-page-bg/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-body font-medium text-text-muted hover:text-ink hover:bg-page-bg rounded transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || activeReturnLines.length === 0}
            className="px-5 py-2 text-body font-bold text-white bg-primary hover:bg-primary-hover rounded shadow-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Return...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>
                  {dueDeduction > 0 && walletCreditAmount === 0
                    ? `Confirm Return (-৳${dueDeduction.toLocaleString("en-BD", { minimumFractionDigits: 2 })} Due)`
                    : dueDeduction > 0 && walletCreditAmount > 0
                    ? `Confirm Return (-৳${dueDeduction.toFixed(2)} Due, +৳${walletCreditAmount.toFixed(2)} Wallet)`
                    : `Confirm Return (৳${walletCreditAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })} Wallet)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
