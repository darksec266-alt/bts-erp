"use client";

import React, { useState } from "react";
import {
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Mail,
  Building,
  CreditCard,
  Bell,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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

  // Core Fields
  const [customerCode, setCustomerCode] = useState(() => `CUST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [isServiceOnly, setIsServiceOnly] = useState(false);

  // Authorized Classification & Status
  const [customerStatus, setCustomerStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [customerType, setCustomerType] = useState<"BUSINESS" | "CORPORATE" | "WHOLESALE" | "RETAIL" | "INDIVIDUAL">("BUSINESS");

  // Contact & Identification
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [taxBinNumber, setTaxBinNumber] = useState("");

  // Credit / Due Settings
  const [allowCredit, setAllowCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("DUE_ON_RECEIPT");

  // Customer Features / Toggles
  const [allowDueSales, setAllowDueSales] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enablePaymentReminders, setEnablePaymentReminders] = useState(true);

  // Optional initial address
  const [addInitialAddress, setAddInitialAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Headquarters");
  const [addressLine, setAddressLine] = useState("");

  // Collapsible advanced sections
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      // Build address array including any extra contact or tax details if present
      const formattedAddress = [
        addressLine.trim(),
        taxBinNumber.trim() ? `BIN: ${taxBinNumber.trim()}` : null,
        contactPerson.trim() ? `Attn: ${contactPerson.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const addresses = addInitialAddress && formattedAddress
        ? [{ label: addressLabel.trim() || "Headquarters", addressLine: formattedAddress }]
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
            : "w-full max-w-xl rounded-md max-h-[90vh]"
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

          {/* Customer Code & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-body font-medium text-ink mb-1">
                Customer Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink font-mono uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="CUST-001"
                required
              />
            </div>

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

          {/* Phone & Status / Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-body font-medium text-ink mb-1">
                Contact Phone <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none transition-colors"
                  placeholder="+8801711000000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-body font-medium text-ink mb-1">Customer Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="w-full px-2.5 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none transition-colors cursor-pointer"
              >
                <option value="BUSINESS">Business</option>
                <option value="CORPORATE">Corporate</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="RETAIL">Retail</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-body font-medium text-ink mb-1">Account Status</label>
              <select
                value={customerStatus}
                onChange={(e) => setCustomerStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none transition-colors cursor-pointer"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Is Service Only Customer */}
          <div className="p-3 rounded-sm border border-border bg-page-bg/60 flex items-start gap-3">
            <input
              type="checkbox"
              id="isServiceOnly"
              checked={isServiceOnly}
              onChange={(e) => setIsServiceOnly(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="isServiceOnly" className="cursor-pointer text-body">
              <span className="font-semibold text-ink block">Service-Only Customer</span>
              <span className="text-caption text-text-muted block">
                Enable if this client receives installation, warranty, or field maintenance services without purchasing hardware.
              </span>
            </label>
          </div>

          {/* Advanced Configuration Accordion Toggle */}
          <div className="border border-border rounded-sm overflow-hidden bg-surface">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[13px] font-medium text-ink bg-page-bg/30 hover:bg-page-bg/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Credit, Tax & Feature Settings (Optional)
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-border bg-surface">
                {/* Contact Person & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-text-muted mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                      placeholder="e.g. Rafiqul Islam (Manager)"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-text-muted mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2 w-3.5 h-3.5 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                        placeholder="accounts@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax / VAT Identification */}
                <div>
                  <label className="block text-[12px] font-medium text-text-muted mb-1">
                    Tax / VAT / BIN Number
                  </label>
                  <input
                    type="text"
                    value={taxBinNumber}
                    onChange={(e) => setTaxBinNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink font-mono focus:border-primary outline-none"
                    placeholder="e.g. 001234567-0101"
                  />
                </div>

                {/* Credit Settings */}
                <div className="p-3 rounded-sm border border-border/70 bg-page-bg/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-ink block">Allow Credit / Due Balance</span>
                      <span className="text-[11px] text-text-muted block">Enable credit limit for delayed billing settlements.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowCredit}
                      onChange={(e) => setAllowCredit(e.target.checked)}
                      className="h-4 w-4 text-primary rounded cursor-pointer"
                    />
                  </div>

                  {allowCredit && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          Credit Limit (BDT)
                        </label>
                        <input
                          type="number"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink font-mono focus:border-primary outline-none"
                          placeholder="50000"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          Payment Terms
                        </label>
                        <select
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none cursor-pointer"
                        >
                          <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                          <option value="NET_15">Net 15 Days</option>
                          <option value="NET_30">Net 30 Days</option>
                          <option value="NET_60">Net 60 Days</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                    <input
                      type="checkbox"
                      checked={allowDueSales}
                      onChange={(e) => setAllowDueSales(e.target.checked)}
                      className="rounded border-border text-primary cursor-pointer"
                    />
                    <span className="text-ink">Allow Due Sales</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                    <input
                      type="checkbox"
                      checked={enableNotifications}
                      onChange={(e) => setEnableNotifications(e.target.checked)}
                      className="rounded border-border text-primary cursor-pointer"
                    />
                    <span className="text-ink">Invoice Notifications</span>
                  </label>
                </div>
              </div>
            )}
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
