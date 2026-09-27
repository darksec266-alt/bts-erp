"use client";

import React, { useState } from "react";
import { QrCode, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { ProductDto, SerialNumberDto, SKULifecycleStage } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateSerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serial: SerialNumberDto) => void;
  products: ProductDto[];
}

export const CreateSerialModal: React.FC<CreateSerialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
}) => {
  const [productId, setProductId] = useState("");
  const [serial, setSerial] = useState("");
  const [currentStage, setCurrentStage] = useState<SKULifecycleStage>("RECEIVED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Register Serial Number"
        icon={QrCode}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !serial.trim()) {
      setError("Please select a product and enter a unique serial number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createSerialNumber({
        productId,
        serial: serial.trim(),
        currentStage,
      });
      onSuccess(res);
      onClose();
      setProductId("");
      setSerial("");
      setCurrentStage("RECEIVED");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register serial number.");
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
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0"
            : "relative w-full max-w-md rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Register Serial Number</h2>
              <p className="text-caption text-text-muted mt-0.5">Unique serialized SKU lifecycle tracking</p>
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
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm flex items-center gap-2 text-danger text-body">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Product <span className="text-danger">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select serialized product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Serial Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="e.g. SN-8921849102"
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Initial Stage</label>
            <select
              value={currentStage}
              onChange={(e) => setCurrentStage(e.target.value as SKULifecycleStage)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="RECEIVED">RECEIVED (In receipt inspection)</option>
              <option value="IN_STOCK">IN_STOCK (Available in warehouse)</option>
              <option value="RESERVED">RESERVED (Allocated to project/order)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-sm bg-primary hover:bg-primary-hover text-surface text-body font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Registering..." : "Add Serial"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
