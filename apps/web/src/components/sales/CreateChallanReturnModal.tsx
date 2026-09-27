"use client";

import React, { useState } from "react";
import { Undo2, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type {
  DeliveryChallanDto,
  DeliveryChallanReturnDto,
  ChallanReturnCondition,
} from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateChallanReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ret: DeliveryChallanReturnDto) => void;
  challans: DeliveryChallanDto[];
  defaultChallanId?: string;
}

interface ReturnLineFormItem {
  challanLineId: string;
  productId: string;
  productName: string;
  originalQty: number;
  quantity: number;
  condition: ChallanReturnCondition;
}

export const CreateChallanReturnModal: React.FC<CreateChallanReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  challans,
  defaultChallanId = "",
}) => {
  const [challanId, setChallanId] = useState(defaultChallanId || (challans[0]?.id ?? ""));
  const [lines, setLines] = useState<ReturnLineFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync lines when challanId changes
  React.useEffect(() => {
    const selectedChallan = challans.find((c) => c.id === challanId);
    if (selectedChallan && selectedChallan.lines) {
      setLines(
        selectedChallan.lines.map((cl) => ({
          challanLineId: cl.id || "",
          productId: cl.productId,
          productName: cl.product?.name || `Product (${cl.product?.sku || cl.productId})`,
          originalQty: cl.quantity,
          quantity: 0,
          condition: "GOOD" as ChallanReturnCondition,
        }))
      );
    } else {
      setLines([]);
    }
  }, [challanId, challans]);

  if (!isOpen) return null;

  const selectedChallan = challans.find((c) => c.id === challanId);

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Challan Return - ${selectedChallan?.challanNumber || "Challan"}`}
        icon={Undo2}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleLineQtyChange = (index: number, val: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, quantity: val };
      return next;
    });
  };

  const handleLineConditionChange = (index: number, val: ChallanReturnCondition) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, condition: val };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanId) {
      setError("Please select a delivery challan.");
      return;
    }

    const activeLines = lines.filter((l) => l.quantity > 0);
    if (activeLines.length === 0) {
      setError("Please enter a return quantity (> 0) for at least one item.");
      return;
    }

    for (const l of activeLines) {
      if (l.quantity > l.originalQty) {
        setError(`Cannot return more than originally dispatched quantity for ${l.productName}.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createChallanReturn({
        challanId,
        lines: activeLines.map((l) => ({
          challanLineId: l.challanLineId,
          quantity: l.quantity,
          condition: l.condition,
        })),
      });

      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record delivery challan return.");
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
            : "relative w-full max-w-2xl rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Record Challan Return</h2>
              <p className="text-caption text-text-muted mt-0.5">Return goods back to stock or file linked damage report</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Select Delivery Challan <span className="text-danger">*</span>
            </label>
            <select
              value={challanId}
              onChange={(e) => setChallanId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select a challan...</option>
              {challans.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.challanNumber} — Order: {ch.salesOrder?.orderNumber} ({ch.salesOrder?.customer?.displayName})
                </option>
              ))}
            </select>
          </div>

          {selectedChallan && (
            <div className="p-3.5 bg-page-bg rounded-sm border border-border flex justify-between items-center text-body">
              <div>
                <span className="text-text-muted">Order: </span>
                <span className="font-medium text-ink">{selectedChallan.salesOrder?.orderNumber}</span>
              </div>
              <div>
                <span className="text-text-muted">Customer: </span>
                <span className="font-semibold text-ink">
                  {selectedChallan.salesOrder?.customer?.displayName || "N/A"}
                </span>
              </div>
            </div>
          )}

          {/* Line items table */}
          <div>
            <label className="block text-caption font-medium text-text-muted mb-2">
              Return Line Items
            </label>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left text-body">
                <thead className="bg-page-bg text-text-muted border-b border-border text-caption font-medium">
                  <tr>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5 text-center w-24">Dispatched</th>
                    <th className="px-3 py-2.5 text-center w-28">Return Qty</th>
                    <th className="px-3 py-2.5 w-48">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, idx) => (
                    <tr key={l.challanLineId || idx} className="hover:bg-page-bg/50">
                      <td className="px-3 py-2.5 text-ink font-medium">
                        {l.productName}
                      </td>
                      <td className="px-3 py-2.5 text-center text-text-muted font-mono">
                        {l.originalQty}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max={l.originalQty}
                          step="1"
                          value={l.quantity || ""}
                          onChange={(e) => handleLineQtyChange(idx, Number(e.target.value))}
                          placeholder="0"
                          className="w-20 h-9 px-2 text-center rounded-sm border border-border bg-surface text-ink text-body font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={l.condition}
                          onChange={(e) =>
                            handleLineConditionChange(idx, e.target.value as ChallanReturnCondition)
                          }
                          className="w-full h-9 px-2 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="GOOD">GOOD (Return to Stock)</option>
                          <option value="DAMAGED">DAMAGED (Auto Damage Report)</option>
                          <option value="FAULTY">FAULTY (Auto Damage Report)</option>
                          <option value="MISSING_PARTS">MISSING_PARTS (Damage Report)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-muted text-body">
                        Select a challan to load items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-caption text-text-muted mt-2">
              Note: Items marked with conditions other than GOOD will automatically generate a linked Damage & Loss Report (§58.2).
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || lines.length === 0}
              className="h-10 px-5 rounded-sm bg-warning text-surface text-body font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Return</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
