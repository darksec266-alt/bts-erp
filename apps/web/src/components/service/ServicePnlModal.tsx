"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Package, Receipt, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "../../lib/api";
import type { ServicePnlDto, ServiceAssignmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface ServicePnlModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ServiceAssignmentDto | null;
}

export const ServicePnlModal: React.FC<ServicePnlModalProps> = ({
  isOpen,
  onClose,
  assignment,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [pnl, setPnl] = useState<ServicePnlDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !assignment) return;
    setLoading(true);
    setError(null);
    api.getServicePnl(assignment.id)
      .then((data) => setPnl(data))
      .catch((err) => setError(err?.message || "Failed to load service P&L statement"))
      .finally(() => setLoading(false));
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`P&L - ${assignment.assignmentNumber}`}
        icon={TrendingUp}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const formatBdt = (val: number) =>
    `BDT ${val.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalCosts = pnl ? pnl.materialCost + pnl.technicianAdvances + pnl.conveyanceExpense : 0;

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
            : "relative w-full max-w-2xl rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Job Costing & Service P&L</h2>
              <p className="text-caption text-text-muted">
                Financial profitability audit for{" "}
                <span className="font-mono font-semibold text-primary">{assignment.assignmentNumber}</span>
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-body font-medium">Computing job costs and revenue...</p>
            </div>
          ) : pnl ? (
            <>
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-sm bg-page-bg/40 border border-border">
                  <div className="text-caption text-text-muted font-medium mb-1">Total Job Revenue</div>
                  <div className="text-h2 font-mono font-bold text-ink">{formatBdt(pnl.revenue)}</div>
                  <div className="text-caption text-text-muted mt-1">From accepted quotation / contract</div>
                </div>

                <div
                  className={`p-5 rounded-sm border ${
                    pnl.netProfit >= 0
                      ? "bg-success-tint/20 border-success/30"
                      : "bg-danger-tint/20 border-danger/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-caption font-semibold text-ink">Net Margin</span>
                    <span
                      className={`text-caption font-mono font-bold flex items-center ${
                        pnl.netProfit >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {pnl.netProfit >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {pnl.marginPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className={`text-h2 font-mono font-bold ${
                      pnl.netProfit >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatBdt(pnl.netProfit)}
                  </div>
                  <div className="text-caption text-text-muted mt-1">
                    {pnl.netProfit >= 0 ? "Profitable service delivery" : "Cost overrun detected"}
                  </div>
                </div>
              </div>

              {/* Itemized Cost Breakdown Table */}
              <div className="border border-border rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-body">
                  <thead>
                    <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                      <th className="py-2.5 px-4">Financial Ledger Component</th>
                      <th className="py-2.5 px-4 text-right">Amount (BDT)</th>
                      <th className="py-2.5 px-4 text-right">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-body">
                    <tr>
                      <td className="py-3 px-4 font-sans flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-ink">Quotation / Service Revenue</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-ink">{formatBdt(pnl.revenue)}</td>
                      <td className="py-3 px-4 text-right text-text-muted">100.0%</td>
                    </tr>
                    <tr className="hover:bg-page-bg/30">
                      <td className="py-3 px-4 font-sans flex items-center gap-2">
                        <Package className="w-4 h-4 text-text-muted" />
                        <span>Custody Parts & Consumables Cost</span>
                      </td>
                      <td className="py-3 px-4 text-right text-danger">({formatBdt(pnl.materialCost)})</td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {pnl.revenue > 0 ? ((pnl.materialCost / pnl.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-page-bg/30">
                      <td className="py-3 px-4 font-sans flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-text-muted" />
                        <span>Technician Cash Advances Issued</span>
                      </td>
                      <td className="py-3 px-4 text-right text-warning">({formatBdt(pnl.technicianAdvances)})</td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {pnl.revenue > 0 ? ((pnl.technicianAdvances / pnl.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-page-bg/30">
                      <td className="py-3 px-4 font-sans flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-text-muted" />
                        <span>Approved Conveyance & Field Expenses</span>
                      </td>
                      <td className="py-3 px-4 text-right text-danger">({formatBdt(pnl.conveyanceExpense)})</td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {pnl.revenue > 0 ? ((pnl.conveyanceExpense / pnl.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="bg-page-bg/40 font-bold border-t border-border">
                      <td className="py-3 px-4 font-sans text-ink">Total Operational Costs</td>
                      <td className="py-3 px-4 text-right text-danger">({formatBdt(totalCosts)})</td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {pnl.revenue > 0 ? ((totalCosts / pnl.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="bg-primary-tint/10 font-bold">
                      <td className="py-3 px-4 font-sans text-primary">Net Contribution Margin</td>
                      <td className="py-3 px-4 text-right text-primary text-h3">{formatBdt(pnl.netProfit)}</td>
                      <td className="py-3 px-4 text-right text-primary">{pnl.marginPercentage.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {/* Action Footer */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
