"use client";

import React, { useState, useEffect } from "react";
import { PackageCheck, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import type { SalesOrderFulfillmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface OrderFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesOrderId: string;
  orderNumber?: string;
}

export const OrderFulfillmentModal: React.FC<OrderFulfillmentModalProps> = ({
  isOpen,
  onClose,
  salesOrderId,
  orderNumber = "",
}) => {
  const [data, setData] = useState<SalesOrderFulfillmentDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (isOpen && salesOrderId) {
      setLoading(true);
      setError(null);
      api
        .getOrderFulfillment(salesOrderId)
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load order fulfillment details.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, salesOrderId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Fulfillment - ${orderNumber || salesOrderId}`}
        icon={PackageCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const allFulfilled = data?.lines.every((l) => l.remaining === 0) ?? false;

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
            : "relative w-full max-w-3xl rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">
                Fulfillment Status ({orderNumber || data?.orderNumber || "Sales Order"})
              </h2>
              <p className="text-caption text-text-muted mt-0.5">
                Line-by-line fulfillment view per database-schema.md §27 / Module 73
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-text-muted gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-body font-medium">Calculating real-time fulfillment balance...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Banner */}
              <div
                className={`p-4 rounded-sm border flex items-center gap-3 ${
                  allFulfilled
                    ? "bg-success-tint border-success/20 text-success"
                    : "bg-warning-tint border-warning/20 text-warning"
                }`}
              >
                {allFulfilled ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold text-body">
                    {allFulfilled ? "100% Fully Fulfilled" : "Partially Fulfilled / Remaining Deliveries"}
                  </h4>
                  <p className="text-caption opacity-90">
                    {allFulfilled
                      ? "All ordered items have been delivered net of any customer returns."
                      : "Some quantities are still remaining to be challaned and dispatched."}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-border rounded-sm overflow-hidden">
                <table className="w-full text-left text-body">
                  <thead className="bg-page-bg text-text-muted border-b border-border text-caption font-semibold">
                    <tr>
                      <th className="px-4 py-3">Product / SKU</th>
                      <th className="px-3 py-3 text-center">Ordered</th>
                      <th className="px-3 py-3 text-center">Challaned</th>
                      <th className="px-3 py-3 text-center">Returned</th>
                      <th className="px-3 py-3 text-center font-bold text-ink">Net Delivered</th>
                      <th className="px-3 py-3 text-center text-primary font-bold">Remaining</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.lines.map((line) => {
                      const isComplete = line.remaining === 0;
                      return (
                        <tr key={line.salesOrderLineId} className="hover:bg-page-bg/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{line.productName}</div>
                            {line.sku && <div className="text-caption text-text-muted font-mono">{line.sku}</div>}
                          </td>
                          <td className="px-3 py-3 text-center font-medium text-ink font-mono">{line.ordered}</td>
                          <td className="px-3 py-3 text-center text-text-muted font-mono">{line.challaned}</td>
                          <td className="px-3 py-3 text-center text-danger font-medium font-mono">
                            {line.returned > 0 ? `-${line.returned}` : "0"}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-ink font-mono">
                            {line.netDelivered}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-primary font-mono">
                            {line.remaining}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-sm text-caption font-medium ${
                                isComplete
                                  ? "bg-success-tint text-success"
                                  : "bg-warning-tint text-warning"
                              }`}
                            >
                              {isComplete ? "Delivered" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-page-bg/50">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
