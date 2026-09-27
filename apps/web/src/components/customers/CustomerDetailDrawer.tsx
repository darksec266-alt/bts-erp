"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Wallet,
  Receipt,
  FileText,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Undo2,
  CheckCircle2,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CustomerDto,
  BranchDto,
  CustomerProfileDto,
  CustomerFinancialSummaryDto,
  InvoiceDto,
  SalesReturnDto,
  CustomerWalletTransactionDto,
} from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";
import { CreateSalesReturnModal } from "../sales/CreateSalesReturnModal";

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
  const [activeTab, setActiveTab] = useState<"profile" | "invoices" | "returns" | "wallet" | "addresses" | "edit">("profile");

  // Profile data state
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Top Up Wallet Modal state
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNotes, setTopupNotes] = useState("");
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // Pay Invoice from Wallet Modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Sales Return Modal state from inside Customer Profile
  const [salesReturnModalOpen, setSalesReturnModalOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<InvoiceDto | null>(null);

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

  const fetchProfile = useCallback(async () => {
    if (!customer?.id) return;
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await api.getCustomerProfile(customer.id);
      setProfile(data);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to load customer profile details.");
    } finally {
      setLoadingProfile(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    if (customer && isOpen) {
      setEditName(customer.displayName);
      setEditPhone(customer.phone);
      setEditBranchId(customer.branchId);
      setEditIsServiceOnly(customer.isServiceOnly);
      setEditIsActive(customer.isActive);
      setActiveTab("profile");
      setConfirmDelete(false);
      fetchProfile();
    }
  }, [customer, isOpen, fetchProfile]);

  if (!isOpen || !customer) return null;

  const branchName =
    customer.branch?.name || branches.find((b) => b.id === customer.branchId)?.name || "Head Office";

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(topupAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setTopupError("Please enter a valid positive top up amount.");
      return;
    }
    setTopupSubmitting(true);
    setTopupError(null);
    try {
      await api.topupCustomerWallet(customer.id, {
        amount: parsed,
        notes: topupNotes.trim() || undefined,
      });
      setTopupModalOpen(false);
      setTopupAmount("");
      setTopupNotes("");
      fetchProfile();
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : "Failed to top up wallet.");
    } finally {
      setTopupSubmitting(false);
    }
  };

  const handlePayFromWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId) {
      setPayError("Please select an invoice to pay.");
      return;
    }
    const parsed = Number(payAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setPayError("Please enter a valid payment amount.");
      return;
    }
    setPaySubmitting(true);
    setPayError(null);
    try {
      await api.payInvoiceFromWallet(customer.id, {
        invoiceId: payInvoiceId,
        amount: parsed,
        notes: payNotes.trim() || undefined,
      });
      setPayModalOpen(false);
      setPayInvoiceId("");
      setPayAmount("");
      setPayNotes("");
      fetchProfile();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to pay invoice from wallet.");
    } finally {
      setPaySubmitting(false);
    }
  };

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
      fetchProfile();
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
      setActiveTab("profile");
      fetchProfile();
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

  const summary = profile?.summary || {
    totalInvoiced: 0,
    totalPaid: 0,
    totalReturned: 0,
    currentDue: 0,
    walletBalance: Number(customer.walletBalance || 0),
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-surface h-full shadow-elevation-4 flex flex-col border-l border-border transition-all duration-200 ${
          isMaximized ? "w-full max-w-none" : "w-full max-w-3xl md:max-w-4xl"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-page-bg/40 flex items-start justify-between">
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
            <h2 className="text-h2 text-ink font-bold leading-tight flex items-center gap-3">
              <span>{customer.displayName}</span>
              <span className="text-caption font-normal text-text-muted font-mono">
                {customer.phone}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTopupModalOpen(true)}
              className="px-3 py-1.5 text-caption font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-colors"
              title="Top up wallet balance (Cash or Bank deposit)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Top Up Wallet</span>
            </button>
            <WindowHeaderActions
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized(!isMaximized)}
              onMinimize={() => setIsMinimized(true)}
              onClose={onClose}
            />
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface border-b border-border">
          <div className="p-3 rounded-md bg-page-bg/50 border border-border">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Total Invoiced
            </span>
            <p className="text-h3 font-mono font-bold text-ink mt-0.5">
              ৳{summary.totalInvoiced.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-text-muted">Lifetime billed</span>
          </div>

          <div className="p-3 rounded-md bg-page-bg/50 border border-border">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Total Paid
            </span>
            <p className="text-h3 font-mono font-bold text-success mt-0.5">
              ৳{summary.totalPaid.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-text-muted">Collected receipts</span>
          </div>

          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
              Current Due
            </span>
            <p className="text-h3 font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              ৳{summary.currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Outstanding receivable
            </span>
          </div>

          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Wallet Balance
              </span>
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-h3 font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ৳{summary.walletBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Advance credit on file
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-page-bg/40 px-4 gap-1 overflow-x-auto text-caption font-medium">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Profile &amp; History</span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "invoices"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices &amp; Bills ({profile?.invoices.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("returns")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "returns"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-warning" />
            <span>Sales Returns ({profile?.salesReturns.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("wallet")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "wallet"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Wallet Ledger ({profile?.walletTransactions.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "addresses"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Addresses ({customer.addresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("edit")}
            className={`py-3 px-3.5 border-b-2 font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "edit"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Info</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loadingProfile ? (
            <div className="py-16 flex flex-col items-center justify-center text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-body">Loading customer profile &amp; financial ledger...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE OVERVIEW */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Account Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-md border border-border bg-page-bg/30">
                    <div>
                      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                        Assigned Branch
                      </span>
                      <p className="text-body font-semibold text-ink mt-0.5">{branchName}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                        Primary Phone
                      </span>
                      <p className="text-body font-mono text-ink mt-0.5">{customer.phone}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                        Total Returns Refunded
                      </span>
                      <p className="text-body font-mono font-bold text-warning mt-0.5">
                        ৳{summary.totalReturned.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Wallet & Due Quick Action Banner */}
                  <div className="p-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-body font-bold text-ink flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        <span>Customer Wallet &amp; Due Settlement</span>
                      </h4>
                      <p className="text-caption text-text-muted">
                        Available Wallet Balance: <strong>৳{summary.walletBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong> | Current Outstanding Due: <strong>৳{summary.currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTopupModalOpen(true)}
                        className="px-3 py-1.5 text-caption font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Deposit Top Up</span>
                      </button>

                      {summary.walletBalance > 0 && summary.currentDue > 0 && (
                        <button
                          onClick={() => {
                            if (profile?.invoices && profile.invoices.length > 0) {
                              const dueInv = profile.invoices.find((i: any) => Number(i.dueAmount || 0) > 0);
                              if (dueInv) {
                                setPayInvoiceId(dueInv.id);
                                setPayAmount(String(Math.min(summary.walletBalance, Number(dueInv.dueAmount || 0))));
                              }
                            }
                            setPayModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-caption font-semibold rounded bg-primary text-white hover:bg-primary-hover shadow-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Due from Wallet</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recent Invoices Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-body font-bold text-ink flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-primary" />
                        <span>Recent Invoices &amp; Bills</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("invoices")}
                        className="text-caption text-primary hover:underline font-medium"
                      >
                        View all ({profile?.invoices.length ?? 0})
                      </button>
                    </div>

                    {!profile?.invoices || profile.invoices.length === 0 ? (
                      <p className="text-caption text-text-muted italic p-4 border border-dashed border-border rounded-md text-center">
                        No commercial invoices recorded for this customer yet.
                      </p>
                    ) : (
                      <div className="border border-border rounded-md overflow-hidden bg-surface">
                        <table className="w-full text-left text-body">
                          <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3">Invoice #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3 text-right">Grand Total (৳)</th>
                              <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                              <th className="py-2.5 px-3 text-right">Due (৳)</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {profile.invoices.slice(0, 5).map((inv: any) => (
                              <tr key={inv.id} className="hover:bg-page-bg/40 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-ink">
                                  {inv.invoiceNumber}
                                </td>
                                <td className="py-2.5 px-3 text-caption text-text-muted">
                                  {new Date(inv.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium">
                                  ৳{Number(inv.grandTotal).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-success">
                                  ৳{Number(inv.totalPaid).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                                  ৳{Number(inv.dueAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForReturn(inv);
                                      setSalesReturnModalOpen(true);
                                    }}
                                    className="px-2 py-0.5 text-[11px] font-medium rounded border border-warning/30 bg-warning-tint hover:bg-warning/20 text-warning inline-flex items-center gap-1 transition-colors"
                                  >
                                    <Undo2 className="w-3 h-3" />
                                    <span>Return</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES & BILLS */}
              {activeTab === "invoices" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-body font-bold text-ink">
                      Customer Invoices &amp; Due Breakdown
                    </h3>
                    <span className="text-caption text-text-muted">
                      Total Due: <strong>৳{summary.currentDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>

                  {!profile?.invoices || profile.invoices.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-md text-text-muted">
                      <Receipt className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                      <p className="text-body font-medium">No invoices found for this customer.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden bg-surface">
                      <table className="w-full text-left text-body">
                        <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Grand Total (৳)</th>
                            <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                            <th className="py-2.5 px-3 text-right">Returns (৳)</th>
                            <th className="py-2.5 px-3 text-right">Due (৳)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {profile.invoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-page-bg/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-ink">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2.5 px-3 text-caption text-text-muted">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">
                                ৳{Number(inv.grandTotal).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-success">
                                ৳{Number(inv.totalPaid).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-warning">
                                ৳{Number(inv.returnedAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                                ৳{Number(inv.dueAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    inv.dueAmount === 0
                                      ? "bg-success-tint text-success"
                                      : "bg-warning-tint text-warning"
                                  }`}
                                >
                                  {inv.dueAmount === 0 ? "PAID" : "DUE"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForReturn(inv);
                                      setSalesReturnModalOpen(true);
                                    }}
                                    className="px-2 py-1 text-caption font-medium rounded border border-warning/30 bg-warning-tint hover:bg-warning/20 text-warning inline-flex items-center gap-1 transition-colors"
                                    title="Return items from this invoice"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                    <span>Return</span>
                                  </button>

                                  {Number(inv.dueAmount || 0) > 0 && summary.walletBalance > 0 && (
                                    <button
                                      onClick={() => {
                                        setPayInvoiceId(inv.id);
                                        setPayAmount(String(Math.min(summary.walletBalance, Number(inv.dueAmount || 0))));
                                        setPayModalOpen(true);
                                      }}
                                      className="px-2 py-1 text-caption font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 transition-colors"
                                      title="Pay due from customer wallet"
                                    >
                                      <Wallet className="w-3.5 h-3.5" />
                                      <span>Pay</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SALES RETURNS */}
              {activeTab === "returns" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-body font-bold text-ink">
                      Sales Returns &amp; Wallet Refund History
                    </h3>
                    <span className="text-caption text-text-muted">
                      Total Refunded to Wallet: <strong>৳{summary.totalReturned.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>

                  {!profile?.salesReturns || profile.salesReturns.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-md text-text-muted">
                      <RotateCcw className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                      <p className="text-body font-medium">No sales returns recorded for this customer.</p>
                      <p className="text-caption text-text-muted mt-1">
                        Returns can be initiated from the Invoices tab.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden bg-surface">
                      <table className="w-full text-left text-body">
                        <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Return #</th>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Warehouse</th>
                            <th className="py-2.5 px-3">Returned Items &amp; Serials</th>
                            <th className="py-2.5 px-3 text-right">Refund Amount (৳)</th>
                            <th className="py-2.5 px-3 text-center">Wallet Credited</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {profile.salesReturns.map((sr: any) => (
                            <tr key={sr.id} className="hover:bg-page-bg/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-ink">
                                {sr.returnNumber}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                                {sr.invoiceNumber || sr.invoiceId}
                              </td>
                              <td className="py-2.5 px-3 text-caption text-text-muted">
                                {new Date(sr.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 text-caption text-ink">
                                {sr.warehouseName || "Main Warehouse"}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="space-y-1">
                                  {sr.lines?.map((line: any) => (
                                    <div key={line.id} className="text-caption flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-ink">{line.quantity}x</span>
                                      <span className="text-ink">{line.productName || "Product"}</span>
                                      {line.serials && line.serials.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {line.serials.map((s: string) => (
                                            <span
                                              key={s}
                                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-tint text-purple border border-purple/20"
                                            >
                                              {s}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-bold text-ink block">
                                  ৳{Number(sr.totalAmount || sr.refundAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </span>
                                {Number(sr.refundAmount) > 0 ? (
                                  <span className="text-[10px] text-emerald-600 font-medium">
                                    Wallet: ৳{Number(sr.refundAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-medium">
                                    Due Adjusted
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {Number(sr.refundAmount) > 0 && sr.creditToWallet ? (
                                  <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20 inline-flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Yes (৳{Number(sr.refundAmount).toFixed(0)})</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    Due Bill Offset
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WALLET LEDGER */}
              {activeTab === "wallet" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-body font-bold text-ink flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        <span>Customer Wallet Running Ledger</span>
                      </h3>
                      <p className="text-caption text-text-muted">
                        Complete chronological record of credits (returns, top-ups) and debits (invoice payments).
                      </p>
                    </div>

                    <button
                      onClick={() => setTopupModalOpen(true)}
                      className="px-3 py-1.5 text-caption font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Top Up Wallet</span>
                    </button>
                  </div>

                  {!profile?.walletTransactions || profile.walletTransactions.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-md text-text-muted">
                      <Wallet className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                      <p className="text-body font-medium">No wallet transactions recorded yet.</p>
                      <p className="text-caption text-text-muted mt-1">
                        Refunds from sales returns and manual deposits will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden bg-surface">
                      <table className="w-full text-left text-body">
                        <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Date &amp; Time</th>
                            <th className="py-2.5 px-3">Transaction Type</th>
                            <th className="py-2.5 px-3">Description / Reference</th>
                            <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                            <th className="py-2.5 px-3 text-right">Balance After (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {profile.walletTransactions.map((tx: any) => {
                            const isCredit = tx.amount > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-page-bg/40 transition-colors">
                                <td className="py-2.5 px-3 text-caption text-text-muted font-mono">
                                  {new Date(tx.createdAt).toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                      isCredit
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                        : "bg-danger-tint text-danger border-danger/20"
                                    }`}
                                  >
                                    {isCredit ? (
                                      <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <ArrowUpRight className="w-3 h-3 text-danger" />
                                    )}
                                    <span>{tx.type}</span>
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-caption text-ink max-w-sm">
                                  {tx.notes || tx.referenceType || "—"}
                                </td>

                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold ${
                                    isCredit ? "text-emerald-600" : "text-danger"
                                  }`}
                                >
                                  {isCredit ? "+" : ""}
                                  ৳{Number(tx.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                                  ৳{Number(tx.balanceAfter).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ADDRESSES */}
              {activeTab === "addresses" && (
                <div className="space-y-6">
                  {addressError && (
                    <div className="p-3 bg-danger-tint border border-danger/20 rounded text-danger text-body flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{addressError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-body font-bold text-ink">Saved Locations &amp; Sites</h3>
                    {customer.addresses.length === 0 ? (
                      <p className="text-caption text-text-muted italic">No addresses saved yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customer.addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className="p-3.5 rounded-md border border-border bg-page-bg/40 space-y-1"
                          >
                            <div className="flex items-center gap-1.5 text-primary font-semibold text-caption">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{addr.label}</span>
                            </div>
                            <p className="text-body text-ink">{addr.addressLine}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddAddress} className="p-4 rounded-md border border-border bg-surface space-y-3">
                    <h4 className="text-caption font-bold text-ink uppercase tracking-wider">
                      Add New Location
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={newAddressLabel}
                          onChange={(e) => setNewAddressLabel(e.target.value)}
                          placeholder="e.g. Warehouse / Head Office"
                          className="w-full px-3 py-1.5 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">
                          Address Line *
                        </label>
                        <input
                          type="text"
                          value={newAddressLine}
                          onChange={(e) => setNewAddressLine(e.target.value)}
                          placeholder="Full street address, district, etc."
                          className="w-full px-3 py-1.5 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingAddress}
                        className="px-4 py-1.5 rounded bg-primary text-white text-caption font-semibold hover:bg-primary-hover shadow-xs inline-flex items-center gap-1.5"
                      >
                        {addingAddress ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Save Address</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 6: EDIT INFO */}
              {activeTab === "edit" && (
                <form onSubmit={handleSaveEdit} className="space-y-4 max-w-lg">
                  {editError && (
                    <div className="p-3 bg-danger-tint border border-danger/20 rounded text-danger text-body flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-caption font-semibold text-text-muted block mb-1">
                      Display / Company Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-caption font-semibold text-text-muted block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-caption font-semibold text-text-muted block mb-1">
                      Branch *
                    </label>
                    <select
                      value={editBranchId}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsServiceOnly}
                        onChange={(e) => setEditIsServiceOnly(e.target.checked)}
                        className="rounded text-primary border-border"
                      />
                      <span className="text-body text-ink">Service Only Customer</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        className="rounded text-primary border-border"
                      />
                      <span className="text-body text-ink">Active Status</span>
                    </label>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-5 py-2 rounded bg-primary text-white text-body font-bold hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Save Changes</span>
                    </button>

                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="px-3 py-1.5 text-caption font-medium text-danger hover:bg-danger-tint rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Customer</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-caption text-danger font-medium">Are you sure?</span>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="px-3 py-1 rounded bg-danger text-white text-caption font-bold hover:bg-danger-hover"
                        >
                          {deleting ? "Deleting..." : "Confirm Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-2 py-1 text-caption text-text-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Top Up Wallet Modal */}
      {topupModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-md border border-border shadow-elevation-4 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-body font-bold text-ink flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span>Top Up Customer Wallet</span>
              </h3>
              <button
                onClick={() => setTopupModalOpen(false)}
                className="p-1 rounded text-text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {topupError && (
              <div className="p-3 bg-danger-tint border border-danger/20 rounded text-danger text-caption flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topupError}</span>
              </div>
            )}

            <form onSubmit={handleTopupSubmit} className="space-y-3">
              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Customer
                </label>
                <p className="text-body font-bold text-ink">{customer.displayName}</p>
                <span className="text-caption text-text-muted">
                  Current Wallet Balance: ৳{summary.walletBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Deposit / Credit Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="w-full px-3 py-2 text-body font-mono font-bold rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Deposit Notes / Channel
                </label>
                <input
                  type="text"
                  value={topupNotes}
                  onChange={(e) => setTopupNotes(e.target.value)}
                  placeholder="e.g. Cash received at counter / bank wire slip #1029"
                  className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTopupModalOpen(false)}
                  className="px-3 py-1.5 text-caption font-medium text-text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topupSubmitting}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-caption font-bold shadow-xs inline-flex items-center gap-1.5"
                >
                  {topupSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Top Up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Invoice from Wallet Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-md border border-border shadow-elevation-4 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-body font-bold text-ink flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span>Pay Invoice from Wallet</span>
              </h3>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded text-text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-danger-tint border border-danger/20 rounded text-danger text-caption flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePayFromWalletSubmit} className="space-y-3">
              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Customer Wallet Balance
                </label>
                <p className="text-body font-bold text-emerald-600 font-mono">
                  ৳{summary.walletBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Select Outstanding Invoice *
                </label>
                <select
                  value={payInvoiceId}
                  onChange={(e) => {
                    setPayInvoiceId(e.target.value);
                    const inv = profile?.invoices.find((i: any) => i.id === e.target.value);
                    if (inv) {
                      setPayAmount(String(Math.min(summary.walletBalance, Number(inv.dueAmount || 0))));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                >
                  <option value="">-- Choose Invoice with Due --</option>
                  {(profile?.invoices || [])
                    .filter((inv: any) => inv.dueAmount > 0)
                    .map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} (Due: ৳{inv.dueAmount})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount to deduct from wallet"
                  required
                  className="w-full px-3 py-2 text-body font-mono font-bold rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid from advance wallet balance"
                  className="w-full px-3 py-2 text-body rounded border border-border bg-surface text-ink focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-3 py-1.5 text-caption font-medium text-text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-caption font-bold shadow-xs inline-flex items-center gap-1.5"
                >
                  {paySubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Return Modal triggered from inside Customer Profile */}
      <CreateSalesReturnModal
        invoice={selectedInvoiceForReturn}
        isOpen={salesReturnModalOpen}
        onClose={() => {
          setSalesReturnModalOpen(false);
          setSelectedInvoiceForReturn(null);
        }}
        onSuccess={() => {
          fetchProfile();
        }}
      />
    </div>
  );
};
