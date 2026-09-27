"use client";

import React, { useState } from "react";
import { FileText, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { TicketDto, QuotationDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateServiceQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quotation: QuotationDto) => void;
  ticket: TicketDto | null;
}

interface QuotationLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const CreateServiceQuotationModal: React.FC<CreateServiceQuotationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ticket,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<QuotationLineItem[]>([
    { description: "Service Inspection & Repair Labor", quantity: 1, unitPrice: 1500 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !ticket) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Service Quotation - ${ticket.ticketNumber}`}
        icon={FileText}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleAddLine = () => {
    setLines([...lines, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof QuotationLineItem,
    val: string | number
  ) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  const totalAmount = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || lines.some((l) => !l.description.trim() || l.quantity <= 0)) {
      setError("Please ensure all line items have descriptions and positive quantities.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const quotation = await api.createServiceQuotation(ticket.id, {
        ticketId: ticket.id,
        lines: lines.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      });
      onSuccess(quotation);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create service quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "relative w-full max-w-3xl rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Create Service Quotation</h2>
              <p className="text-caption text-text-muted">
                Ticket <span className="font-mono font-semibold text-primary">{ticket.ticketNumber}</span>:{" "}
                {ticket.description}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-page-bg/40 p-4 rounded-sm border border-border">
            <div>
              <span className="text-caption text-text-muted block">Ticket Customer</span>
              <span className="text-body font-semibold text-ink">
                {ticket.customer?.displayName || ticket.customerId}
              </span>
            </div>
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Valid Until Date</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                required
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-bold text-ink">Quotation Line Items</h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 text-caption font-medium rounded-sm border border-border bg-page-bg text-ink hover:border-primary flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                    <th className="py-2.5 px-3">Item / Service Description</th>
                    <th className="py-2.5 px-3 w-28 text-right">Qty</th>
                    <th className="py-2.5 px-3 w-36 text-right">Unit Price (BDT)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-page-bg/30">
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                          placeholder="e.g. Capacitor Replacement / Technician On-site Visit"
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                          required
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink text-right focus:border-primary outline-none"
                          required
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            handleLineChange(idx, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink text-right focus:border-primary outline-none"
                          required
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-semibold text-ink">
                        {(line.quantity * line.unitPrice).toLocaleString("en-BD", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-text-muted hover:text-danger disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end p-3 bg-page-bg/20 border border-border rounded-sm">
              <div className="text-right">
                <span className="text-caption text-text-muted uppercase tracking-wider block">
                  Grand Total
                </span>
                <span className="text-h2 font-mono font-bold text-primary">
                  BDT {totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
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
              disabled={loading}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Issue Service Quotation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
