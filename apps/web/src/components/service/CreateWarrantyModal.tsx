"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { WarrantyDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (warranty: WarrantyDto) => void;
}

export const CreateWarrantyModal: React.FC<CreateWarrantyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [serialNumberId, setSerialNumberId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [termMonths, setTermMonths] = useState<number>(12);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Register Warranty"
        icon={ShieldCheck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumberId.trim()) {
      setError("Please enter the serial number ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const warranty = await api.createWarranty({
        serialNumberId: serialNumberId.trim(),
        startDate: new Date(startDate).toISOString(),
        termMonths: Number(termMonths),
      });
      onSuccess(warranty);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to register equipment warranty");
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
            : "relative w-full max-w-xl rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Register Product Warranty</h2>
              <p className="text-caption text-text-muted">
                Activate serialized warranty coverage for customer asset
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Asset Serial Number ID <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={serialNumberId}
              onChange={(e) => setSerialNumberId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none font-mono"
              placeholder="e.g. SN-UPS-2026-99120 or Serial Record UUID"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">Coverage Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">Term (Months)</label>
              <select
                value={termMonths}
                onChange={(e) => setTermMonths(parseInt(e.target.value) || 12)}
                className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
                <option value="60">60 Months (5 Years)</option>
              </select>
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
              disabled={loading || !serialNumberId.trim()}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Register Warranty</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
