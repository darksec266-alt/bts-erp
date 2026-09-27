"use client";

import React, { useState } from "react";
import {
  Building2,
  Phone,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerDto, BranchDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CustomerDetailDrawerProps {
  customer: CustomerDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: CustomerDto) => void;
  onDelete: (id: string) => void;
  branches: BranchDto[];
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  branches,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "edit">("overview");

  // New Address state
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressLine, setNewAddressLine] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editIsServiceOnly, setEditIsServiceOnly] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize edit fields when customer changes
  React.useEffect(() => {
    if (customer) {
      setEditName(customer.displayName);
      setEditPhone(customer.phone);
      setEditBranchId(customer.branchId);
      setEditIsServiceOnly(customer.isServiceOnly);
      setEditIsActive(customer.isActive);
      setActiveTab("overview");
      setConfirmDelete(false);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLabel.trim() || !newAddressLine.trim()) {
      setAddressError("Both label and address line are required.");
      return;
    }
    setAddingAddress(true);
    setAddressError(null);
    try {
      const updated = await api.addCustomerAddress(customer.id, {
        label: newAddressLabel.trim(),
        addressLine: newAddressLine.trim(),
      });
      onUpdate(updated);
      setNewAddressLabel("");
      setNewAddressLine("");
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Failed to add address.");
    } finally {
      setAddingAddress(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setEditError(null);
    try {
      const updated = await api.updateCustomer(customer.id, {
        displayName: editName.trim(),
        phone: editPhone.trim(),
        branchId: editBranchId,
        isServiceOnly: editIsServiceOnly,
        isActive: editIsActive,
      });
      onUpdate(updated);
      setActiveTab("overview");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update customer.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCustomer(customer.id);
      onDelete(customer.id);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  const branchName =
    customer.branch?.name || branches.find((b) => b.id === customer.branchId)?.name || "Head Office";

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={customer.displayName}
        icon={Users}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fadeIn">
      <div
        className={`bg-surface h-full shadow-elevation-2 flex flex-col border-l border-border animate-slideLeft transition-all duration-200 ${
          isMaximized ? "w-full max-w-none" : "w-full max-w-xl md:max-w-2xl"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                {customer.customerCode}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  customer.isActive
                    ? "bg-success-tint text-success"
                    : "bg-danger-tint text-danger"
                }`}
              >
                {customer.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              {customer.isServiceOnly && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-tint text-teal">
                  SERVICE-ONLY
                </span>
              )}
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">{customer.displayName}</h2>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border px-6 bg-surface">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 text-body font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`py-3 px-4 text-body font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "addresses"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            Address Book
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-page-bg text-text-muted">
              {customer.addresses?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`py-3 px-4 text-body font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "edit"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Profile Details Card */}
              <div className="bg-page-bg/50 border border-border rounded-md p-4 space-y-3">
                <h3 className="text-body-strong text-ink border-b border-border pb-2">
                  Account Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-body">
                  <div>
                    <span className="text-caption text-text-muted block">Direct Phone</span>
                    <a
                      href={`tel:${customer.phone}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Phone className="w-3.5 h-3.5" /> {customer.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-caption text-text-muted block">Assigned Branch</span>
                    <span className="font-medium text-ink flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-text-muted" /> {branchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-text-muted block">Service Scope</span>
                    <span className="font-medium text-ink mt-0.5 block">
                      {customer.isServiceOnly ? "Field Service Only (Mod 72)" : "Full Hardware & Service"}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-text-muted block">Created Date</span>
                    <span className="font-medium text-ink flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : "Registered"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Address Preview */}
              <div className="bg-surface border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-body-strong text-ink flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Registered Addresses
                  </h3>
                  <button
                    onClick={() => setActiveTab("addresses")}
                    className="text-caption text-primary hover:underline font-medium"
                  >
                    Manage ({customer.addresses?.length || 0})
                  </button>
                </div>
                {customer.addresses && customer.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {customer.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3 rounded-sm border border-border bg-page-bg/40 text-body"
                      >
                        <span className="text-caption font-bold text-primary uppercase tracking-wider block">
                          {addr.label}
                        </span>
                        <p className="text-ink mt-0.5">{addr.addressLine}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-muted text-body bg-page-bg/40 rounded-sm border border-dashed border-border">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-text-muted/40" />
                    <span>No address added yet.</span>
                    <button
                      onClick={() => setActiveTab("addresses")}
                      className="block mx-auto mt-2 text-caption text-primary font-medium hover:underline"
                    >
                      + Add Address Now
                    </button>
                  </div>
                )}
              </div>

              {/* Dangerous actions */}
              <div className="pt-6 border-t border-border">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 px-4 rounded-sm border border-danger/30 text-danger hover:bg-danger/10 text-body font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Deactivate / Delete Customer
                  </button>
                ) : (
                  <div className="p-4 rounded-md border border-danger/40 bg-danger/5 space-y-3">
                    <div className="flex items-start gap-2 text-danger">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-body-strong font-semibold">Confirm Deactivation</p>
                        <p className="text-caption text-danger/80">
                          Are you sure you want to deactivate {customer.displayName}? This customer will be soft-deleted in accordance with system integrity rules.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 text-caption font-medium rounded-sm border border-border bg-surface text-ink hover:bg-page-bg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-1.5 text-caption font-medium rounded-sm bg-danger text-white hover:bg-danger/90 disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-6">
              {/* Existing Addresses */}
              <div className="space-y-3">
                <h3 className="text-body-strong text-ink">All Registered Locations</h3>
                {customer.addresses && customer.addresses.length > 0 ? (
                  customer.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 rounded-md border border-border bg-surface shadow-elevation-1 flex items-start justify-between"
                    >
                      <div>
                        <span className="text-caption font-bold text-primary uppercase tracking-wider bg-primary-tint px-2 py-0.5 rounded">
                          {addr.label}
                        </span>
                        <p className="text-body text-ink font-medium mt-2">{addr.addressLine}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-body text-text-muted">No addresses saved for this customer.</p>
                )}
              </div>

              {/* Form to add new address */}
              <form
                onSubmit={handleAddAddress}
                className="border border-border rounded-md p-4 bg-page-bg/40 space-y-4"
              >
                <h4 className="text-body-strong text-ink flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add New Location
                </h4>

                {addressError && (
                  <div className="p-2.5 rounded-sm bg-danger/10 border border-danger/20 text-danger text-caption">
                    {addressError}
                  </div>
                )}

                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Location Label <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddressLabel}
                    onChange={(e) => setNewAddressLabel(e.target.value)}
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                    placeholder="e.g. Chittagong Distribution Hub"
                    required
                  />
                </div>

                <div>
                  <label className="block text-caption font-medium text-text-muted mb-1">
                    Street Address & Details <span className="text-danger">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newAddressLine}
                    onChange={(e) => setNewAddressLine(e.target.value)}
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none resize-none"
                    placeholder="e.g. Agrabad C/A, Chittagong-4100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingAddress}
                  className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-body font-medium rounded-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {addingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Save Location
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === "edit" && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-sm bg-danger/10 border border-danger/20 text-danger text-body flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-caption font-medium text-text-muted mb-1">
                  Customer / Company Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-caption font-medium text-text-muted mb-1">
                  Phone Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-caption font-medium text-text-muted mb-1">
                  Assigned Branch
                </label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service-Only Checkbox */}
              <div className="p-3 rounded-sm border border-border bg-page-bg/40 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editServiceOnly"
                  checked={editIsServiceOnly}
                  onChange={(e) => setEditIsServiceOnly(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-border"
                />
                <label htmlFor="editServiceOnly" className="text-body font-medium text-ink cursor-pointer">
                  Service-Only Customer (Module 72)
                </label>
              </div>

              {/* Active / Inactive Toggle */}
              <div className="p-3 rounded-sm border border-border bg-page-bg/40 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-border"
                />
                <label htmlFor="editActive" className="text-body font-medium text-ink cursor-pointer">
                  Active Account Status
                </label>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2 border border-border rounded-sm text-text-muted hover:text-ink text-body font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-body font-medium rounded-sm flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Update Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
