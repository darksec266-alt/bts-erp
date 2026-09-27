"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Truck,
} from "lucide-react";
import { api } from "../../lib/api";
import type { SupplierDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface SupplierDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDto | null;
  onUpdate: (updated: SupplierDto) => void;
  onDelete: (id: string) => void;
}

export const SupplierDetailDrawer: React.FC<SupplierDetailDrawerProps> = ({
  isOpen,
  onClose,
  supplier,
  onUpdate,
  onDelete,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loadingContact, setLoadingContact] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !supplier) return null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError("Contact name and phone are required.");
      return;
    }

    setLoadingContact(true);
    setError(null);
    try {
      const updated = await api.addSupplierContact(supplier.id, {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        isPrimary,
      });
      onUpdate(updated);
      setNewContactName("");
      setNewContactPhone("");
      setIsPrimary(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setLoadingContact(false);
    }
  };

  const handleToggleActive = async () => {
    setError(null);
    try {
      const updated = await api.updateSupplier(supplier.id, {
        isActive: !supplier.isActive,
      });
      onUpdate(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${supplier.companyName}?`)) {
      return;
    }
    setLoadingDelete(true);
    setError(null);
    try {
      await api.deleteSupplier(supplier.id);
      onDelete(supplier.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cannot delete supplier with active purchase orders.");
    } finally {
      setLoadingDelete(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={supplier.companyName}
        icon={Truck}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen bg-surface border-l border-border shadow-elevation-3 flex flex-col transition-all duration-200 ${
            isMaximized ? "max-w-none w-full" : "max-w-md"
          }`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-border bg-page-bg/50 flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                SUPPLIER RECORD
              </span>
              <h2 className="text-h3 font-bold text-ink mt-1">
                {supplier.companyName}
              </h2>
              <p className="text-caption text-text-muted font-mono mt-0.5">
                {supplier.supplierCode}
              </p>
            </div>
            <WindowHeaderActions
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized(!isMaximized)}
              onMinimize={() => setIsMinimized(true)}
              onClose={onClose}
            />
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded text-danger text-caption flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Status toggle banner */}
            <div className="p-3 bg-page-bg rounded border border-border flex items-center justify-between">
              <div>
                <span className="text-caption font-medium text-ink block">Operating Status</span>
                <span className={`text-[11px] font-semibold ${supplier.isActive ? "text-success" : "text-text-muted"}`}>
                  {supplier.isActive ? "Active Approved Vendor" : "Deactivated / On Hold"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleActive}
                className={`px-3 py-1 rounded text-caption font-medium border transition-colors ${
                  supplier.isActive
                    ? "border-danger/30 text-danger hover:bg-danger/10"
                    : "border-success/30 text-success hover:bg-success/10"
                }`}
              >
                {supplier.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>

            {/* Contacts list */}
            <div>
              <h3 className="text-caption font-semibold text-ink uppercase tracking-wider mb-3">
                Authorized Contacts ({supplier.contacts?.length || 0})
              </h3>
              <div className="space-y-2">
                {supplier.contacts && supplier.contacts.length > 0 ? (
                  supplier.contacts.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="p-3 bg-page-bg/60 border border-border rounded-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-caption font-semibold text-ink">{c.name}</span>
                            {c.isPrimary && (
                              <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] font-semibold rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-caption text-text-muted italic">No contacts added yet.</p>
                )}
              </div>
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="p-4 bg-page-bg/80 border border-border rounded-sm space-y-3">
              <h4 className="text-caption font-semibold text-ink">Add New Contact</h4>
              <div>
                <input
                  type="text"
                  placeholder="Contact Name *"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full h-8 px-2.5 border border-border rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Phone Number *"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full h-8 px-2.5 border border-border rounded-sm bg-surface text-ink text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Mark as Primary</span>
                </label>
                <button
                  type="submit"
                  disabled={loadingContact}
                  className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-medium rounded-sm hover:bg-primary-hover disabled:opacity-50"
                >
                  {loadingContact ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add Contact</span>
                </button>
              </div>
            </form>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-border bg-page-bg flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loadingDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-danger border border-danger/30 rounded-sm text-caption font-medium hover:bg-danger/10 transition-colors disabled:opacity-50"
            >
              {loadingDelete ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Delete Supplier</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-border rounded-sm text-body text-ink font-medium hover:bg-surface transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
