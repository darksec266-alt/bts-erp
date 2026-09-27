"use client";

import React, { useState } from "react";
import { Phone, MapPin, Check, AlertCircle, Loader2, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerDto, BranchDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: CustomerDto) => void;
  branches: BranchDto[];
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [customerCode, setCustomerCode] = useState(() => `CUST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [isServiceOnly, setIsServiceOnly] = useState(false);
  
  // Optional initial address
  const [addInitialAddress, setAddInitialAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Headquarters");
  const [addressLine, setAddressLine] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!customerCode.trim()) {
      setError("Customer Code is required.");
      return;
    }
    if (!displayName.trim()) {
      setError("Display Name / Company Name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Contact Phone number is required.");
      return;
    }
    const targetBranch = branchId || branches[0]?.id;
    if (!targetBranch) {
      setError("A branch must be selected.");
      return;
    }

    setLoading(true);
    try {
      const addresses = addInitialAddress && addressLine.trim()
        ? [{ label: addressLabel.trim() || "Headquarters", addressLine: addressLine.trim() }]
        : undefined;

      const created = await api.createCustomer({
        customerCode: customerCode.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        branchId: targetBranch,
        isServiceOnly,
        addresses,
      });

      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register customer.");
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Register New Customer"
        icon={Users}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm animate-fadeIn ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "w-full max-w-lg rounded-md max-h-[90vh]"
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/40">
          <div>
            <h2 className="text-h2 text-ink">Register New Customer</h2>
            <p className="text-caption text-text-muted">
              Create a verified enterprise or retail customer account
            </p>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-sm bg-danger/10 border border-danger/20 text-danger text-body">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Code */}
            <div>
              <label className="block text-body font-medium text-ink mb-1">
                Customer Code <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink font-mono uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  placeholder="CUST-001"
                  required
                />
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-body font-medium text-ink mb-1">
                Allocated Branch <span className="text-danger">*</span>
              </label>
              <select
                value={branchId || branches[0]?.id || ""}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Company / Display Name */}
          <div>
            <label className="block text-body font-medium text-ink mb-1">
              Customer / Company Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="e.g. Walton Hi-Tech Industries PLC"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-body font-medium text-ink mb-1">
              Contact Phone Number <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="+8801711000000"
                required
              />
            </div>
            <p className="text-[12px] text-text-muted mt-1">Must be unique per customer profile.</p>
          </div>

          {/* Is Service Only (Module 72 Specification) */}
          <div className="p-3 rounded-sm border border-border bg-page-bg/60 flex items-start gap-3">
            <input
              type="checkbox"
              id="isServiceOnly"
              checked={isServiceOnly}
              onChange={(e) => setIsServiceOnly(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="isServiceOnly" className="cursor-pointer text-body">
              <span className="font-semibold text-ink block">Service-Only Customer (Module 72)</span>
              <span className="text-caption text-text-muted block">
                Enable if this client receives installation, warranty, or field maintenance services without purchasing hardware.
              </span>
            </label>
          </div>

          {/* Initial Address Accordion */}
          <div className="border border-border rounded-sm p-3 bg-surface">
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-strong text-ink flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" /> Primary Address (Optional)
              </span>
              <input
                type="checkbox"
                checked={addInitialAddress}
                onChange={(e) => setAddInitialAddress(e.target.checked)}
                className="h-4 w-4 text-primary rounded cursor-pointer"
              />
            </div>
            {addInitialAddress && (
              <div className="space-y-3 mt-3 pt-3 border-t border-border">
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Address Label
                  </label>
                  <input
                    type="text"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                    placeholder="e.g. Headquarters / Plant / Site Office"
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Street Address & Location
                  </label>
                  <textarea
                    rows={2}
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none resize-none"
                    placeholder="e.g. Plot 12, Road 4, Sector 7, Uttara, Dhaka"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm border border-border text-body font-medium text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-body font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
