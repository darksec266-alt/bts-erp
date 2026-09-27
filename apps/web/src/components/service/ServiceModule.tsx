"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wrench,
  Calendar,
  PackageCheck,
  MapPin,
  DollarSign,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  UserCheck,
  TrendingUp,
  Receipt,
  FileText,
  ShieldAlert,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  TicketDto,
  ServiceAssignmentDto,
  ProductCustodyDto,
  LiveLocationLogDto,
  TechnicianAdvanceDto,
  ConveyanceBillDto,
  WarrantyDto,
  WarrantyClaimDto,
  CustomerDto,
  ProductDto,
  BranchDto,
  ServiceStatsDto,
  CustodyStatus,
  AssignmentStatus,
} from "@bts/shared-types";
import { CreateServiceTicketModal } from "./CreateServiceTicketModal";
import { CreateServiceQuotationModal } from "./CreateServiceQuotationModal";
import { CreateServiceAssignmentModal } from "./CreateServiceAssignmentModal";
import { AssignTechnicianModal } from "./AssignTechnicianModal";
import { IssueProductCustodyModal } from "./IssueProductCustodyModal";
import { IssueTechnicianAdvanceModal } from "./IssueTechnicianAdvanceModal";
import { SubmitConveyanceBillModal } from "./SubmitConveyanceBillModal";
import { RecordGpsCheckinModal } from "./RecordGpsCheckinModal";
import { CloseServiceAssignmentModal } from "./CloseServiceAssignmentModal";
import { ServicePnlModal } from "./ServicePnlModal";
import { CreateWarrantyModal } from "./CreateWarrantyModal";
import { CreateWarrantyClaimModal } from "./CreateWarrantyClaimModal";
import { ToastContainer, type ToastMessage } from "../common/Toast";

interface ServiceModuleProps {
  selectedBranchId?: string;
}

export const ServiceModule: React.FC<ServiceModuleProps> = ({ selectedBranchId }) => {
  // Primary Tabs
  const [activeTab, setActiveTab] = useState<
    "tickets" | "assignments" | "custody" | "visits" | "finances" | "warranties"
  >("tickets");

  // Core Data States (Strictly real DB records, zero demo data)
  const [stats, setStats] = useState<ServiceStatsDto>({
    totalTickets: 0,
    openTickets: 0,
    activeAssignments: 0,
    inProgressAssignments: 0,
    closedAssignments: 0,
    pendingConveyanceBills: 0,
    activeWarranties: 0,
  });
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignmentDto[]>([]);
  const [custodyItems, setCustodyItems] = useState<ProductCustodyDto[]>([]);
  const [locationLogs, setLocationLogs] = useState<LiveLocationLogDto[]>([]);
  const [advances, setAdvances] = useState<TechnicianAdvanceDto[]>([]);
  const [conveyanceBills, setConveyanceBills] = useState<ConveyanceBillDto[]>([]);
  const [warranties, setWarranties] = useState<WarrantyDto[]>([]);
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaimDto[]>([]);

  // Master Reference Data
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [employees, setEmployees] = useState<{ id: string; employeeCode: string; firstName?: string; lastName?: string; fullName?: string }[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("ALL");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>("ALL");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>("ALL");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals States
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [selectedTicketForQuote, setSelectedTicketForQuote] = useState<TicketDto | null>(null);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentPreselectTicketId, setAssignmentPreselectTicketId] = useState<string | undefined>(undefined);

  const [isAssignTechModalOpen, setIsAssignTechModalOpen] = useState(false);
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isConveyanceModalOpen, setIsConveyanceModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<ServiceAssignmentDto | null>(null);

  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load Reference Data
  useEffect(() => {
    Promise.all([
      api.getCustomers({ take: 100 }).then((res) => setCustomers(res.items)).catch(() => {}),
      api.getProducts({ take: 100 }).then((res) => setProducts(res.items)).catch(() => {}),
      api.getBranches().then((res) => setBranches(res.items)).catch(() => {}),
      api.getEmployees({ take: 100 }).then((res) => setEmployees(res.items)).catch(() => {}),
    ]);
  }, []);

  // Fetch Module Data
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        statsData,
        ticketsData,
        assignmentsData,
        custodyData,
        logsData,
        advancesData,
        billsData,
        warrantiesData,
        claimsData,
      ] = await Promise.all([
        api.getServiceStats(selectedBranchId),
        api.getTickets({ branchId: selectedBranchId }),
        api.getServiceAssignments({ branchId: selectedBranchId }),
        api.getCustody(),
        api.getLiveLocations(),
        api.getTechnicianAdvances(),
        api.getConveyanceBills(),
        api.getWarranties(),
        api.getWarrantyClaims(),
      ]);

      setStats(statsData);
      setTickets(ticketsData);
      setAssignments(assignmentsData);
      setCustodyItems(custodyData);
      setLocationLogs(logsData);
      setAdvances(advancesData);
      setConveyanceBills(billsData);
      setWarranties(warrantiesData);
      setWarrantyClaims(claimsData);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to load service management data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  // Status Handlers
  const handleUpdateAssignmentStatus = async (id: string, status: AssignmentStatus) => {
    try {
      const updated = await api.updateAssignmentStatus(id, status);
      setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      addToast("success", `Assignment updated to ${status}`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to update assignment status");
    }
  };

  const handleUpdateCustodyStatus = async (id: string, status: CustodyStatus) => {
    try {
      const updated = await api.updateCustodyStatus(id, status);
      setCustodyItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
      addToast("success", `Custody item marked as ${status}`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to update custody status");
    }
  };

  const handleApproveConveyance = async (billId: string) => {
    try {
      const updated = await api.approveConveyanceBill(billId);
      setConveyanceBills((prev) => prev.map((b) => (b.id === billId ? updated : b)));
      addToast("success", "Conveyance bill approved successfully!");
      fetchData();
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to approve conveyance bill");
    }
  };

  const handleRejectConveyance = async (billId: string) => {
    try {
      const updated = await api.rejectConveyanceBill(billId);
      setConveyanceBills((prev) => prev.map((b) => (b.id === billId ? updated : b)));
      addToast("info", "Conveyance bill rejected");
      fetchData();
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Failed to reject conveyance bill");
    }
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        !search.trim() ||
        t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        t.serialNumberId?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = ticketStatusFilter === "ALL" || t.status === ticketStatusFilter;
      const matchesType = ticketTypeFilter === "ALL" || t.ticketType === ticketTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [tickets, search, ticketStatusFilter, ticketTypeFilter]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        !search.trim() ||
        a.assignmentNumber.toLowerCase().includes(search.toLowerCase()) ||
        a.sourceId.toLowerCase().includes(search.toLowerCase()) ||
        a.technicians?.some((tech) =>
          tech.technician?.firstName?.toLowerCase().includes(search.toLowerCase())
        );

      const matchesStatus =
        assignmentStatusFilter === "ALL" || a.status === assignmentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assignments, search, assignmentStatusFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn font-sans">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-sm bg-primary-tint text-primary">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-h1 text-ink font-bold tracking-tight">Field Service & Tickets</h1>
          </div>
          <p className="text-body text-text-muted mt-1">
            Dispatch technicians, track serialized warranty claims, monitor live GPS visits, and inspect job costing P&L.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-sm border border-border bg-surface text-ink hover:bg-page-bg transition-colors disabled:opacity-50"
            title="Refresh Service Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsTicketModalOpen(true)}
            className="px-4 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAssignmentPreselectTicketId(undefined);
              setIsAssignmentModalOpen(true);
            }}
            className="px-4 py-2 text-body font-semibold rounded-sm border border-primary text-primary bg-primary-tint/20 hover:bg-primary-tint/40 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Dispatch Assignment</span>
          </button>
        </div>
      </div>

      {/* High-Level Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-sm bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted mb-1">
            <span>Open Tickets</span>
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <div className="text-h2 font-mono font-bold text-ink">{stats.openTickets}</div>
          <div className="text-[11px] text-text-muted mt-1">Awaiting resolution</div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted mb-1">
            <span>Active Assignments</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="text-h2 font-mono font-bold text-ink">{stats.activeAssignments}</div>
          <div className="text-[11px] text-text-muted mt-1">Fieldwork scheduled</div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted mb-1">
            <span>Custody In Field</span>
            <PackageCheck className="w-4 h-4 text-warning" />
          </div>
          <div className="text-h2 font-mono font-bold text-ink">{custodyItems.filter(c => c.status === "ASSIGNED").length}</div>
          <div className="text-[11px] text-text-muted mt-1">Equipment with tech</div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted mb-1">
            <span>Pending Conveyance</span>
            <Receipt className="w-4 h-4 text-danger" />
          </div>
          <div className="text-h2 font-mono font-bold text-ink">{stats.pendingConveyanceBills}</div>
          <div className="text-[11px] text-text-muted mt-1">Four-eyes approval req.</div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted mb-1">
            <span>Active Warranties</span>
            <ShieldCheck className="w-4 h-4 text-success" />
          </div>
          <div className="text-h2 font-mono font-bold text-ink">{stats.activeWarranties}</div>
          <div className="text-[11px] text-text-muted mt-1">Serialized coverage</div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="border-b border-border flex items-center gap-6 overflow-x-auto">
        {[
          { id: "tickets", label: "Service Tickets", count: tickets.length, icon: Wrench },
          { id: "assignments", label: "Assignments & Dispatch", count: assignments.length, icon: Calendar },
          { id: "custody", label: "Product Custody", count: custodyItems.length, icon: PackageCheck },
          { id: "visits", label: "GPS Visit Logs", count: locationLogs.length, icon: MapPin },
          { id: "finances", label: "Advances & Conveyance", count: advances.length + conveyanceBills.length, icon: DollarSign },
          { id: "warranties", label: "Warranties & Claims", count: warranties.length, icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | "tickets"
                    | "assignments"
                    | "custody"
                    | "visits"
                    | "finances"
                    | "warranties"
                )
              }
              className={`pb-3 pt-2 text-body font-semibold flex items-center gap-2 transition-colors border-b-2 relative whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-primary text-white" : "bg-page-bg text-text-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TICKETS */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 border border-border rounded-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search ticket #, description, customer, serial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={ticketTypeFilter}
                onChange={(e) => setTicketTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="PAID_SERVICE_REQUEST">Paid Service</option>
                <option value="WARRANTY_CLAIM">Warranty Claim</option>
              </select>

              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-body">
              <thead>
                <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                  <th className="py-3 px-4 font-semibold">Ticket #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Asset Serial</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Quotation</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      Loading service tickets...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No service tickets found. Click "New Ticket" to log a customer request.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{t.ticketNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{t.customer?.displayName || t.customerId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-caption px-2 py-0.5 rounded font-medium ${
                            t.ticketType === "WARRANTY_CLAIM"
                              ? "bg-warning-tint text-warning"
                              : "bg-primary-tint text-primary"
                          }`}
                        >
                          {t.ticketType === "WARRANTY_CLAIM" ? "Warranty Claim" : "Paid Service"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-caption text-ink">
                        {t.serialNumberId || <span className="text-text-muted italic">None</span>}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={t.description}>
                        <div className="text-body text-ink truncate">{t.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-caption font-semibold px-2.5 py-0.5 rounded ${
                            t.status === "CLOSED"
                              ? "bg-success-tint text-success"
                              : t.status === "RESOLVED"
                              ? "bg-accent-tint text-accent"
                              : t.status === "IN_PROGRESS"
                              ? "bg-primary-tint text-primary"
                              : "bg-warning-tint text-warning"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-caption">
                        {t.serviceQuotation ? (
                          <div className="font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.serviceQuotation.status === "ACCEPTED"
                                  ? "bg-success-tint text-success"
                                  : "bg-warning-tint text-warning"
                              }`}
                            >
                              {t.serviceQuotation.status}
                            </span>
                            <div className="text-ink font-semibold mt-0.5">
                              BDT {Number(t.serviceQuotation.grandTotal || 0).toLocaleString()}
                            </div>
                          </div>
                        ) : t.ticketType === "PAID_SERVICE_REQUEST" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicketForQuote(t);
                              setIsQuotationModalOpen(true);
                            }}
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Create Quote</span>
                          </button>
                        ) : (
                          <span className="text-text-muted italic">N/A (Warranty)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignmentPreselectTicketId(t.id);
                                setIsAssignmentModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-caption font-semibold rounded-sm bg-primary-tint text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                              title="Create Dispatch Assignment"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS & DISPATCH */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 border border-border rounded-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search code, reference, technician..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-body">
              <thead>
                <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                  <th className="py-3 px-4 font-semibold">Assignment #</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Assigned Technicians</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold">Lifecycle Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      Loading service assignments...
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No field assignments found. Click "Dispatch Assignment" to schedule field visits.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{a.assignmentNumber}</td>
                      <td className="py-3 px-4">
                        <span className="text-caption font-semibold bg-page-bg px-2 py-0.5 rounded border border-border text-ink">
                          {a.sourceType}
                        </span>
                        <div className="font-mono text-[11px] text-text-muted mt-0.5 truncate max-w-[120px]">
                          {a.sourceId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {a.technicians && a.technicians.length > 0 ? (
                          <div className="space-y-1">
                            {a.technicians.map((t, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-tint/30 text-primary text-caption font-semibold mr-1"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>{t.technician ? `${t.technician.firstName} ${t.technician.lastName}` : t.employeeId}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsAssignTechModalOpen(true);
                            }}
                            className="text-primary hover:underline text-caption font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Tech</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-caption text-text-muted">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-caption font-semibold px-2.5 py-0.5 rounded ${
                            a.status === "CLOSED"
                              ? "bg-success-tint text-success"
                              : a.status === "COMPLETED"
                              ? "bg-accent-tint text-accent"
                              : a.status === "IN_PROGRESS"
                              ? "bg-primary-tint text-primary"
                              : "bg-warning-tint text-warning"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Lifecycle Quick Status Buttons */}
                          {a.status === "ASSIGNED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssignmentStatus(a.id, "ACCEPTED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-page-bg border border-border text-ink hover:border-primary"
                            >
                              Accept
                            </button>
                          )}
                          {a.status === "ACCEPTED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssignmentStatus(a.id, "IN_PROGRESS")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-primary text-white hover:bg-primary-hover"
                            >
                              Start Job
                            </button>
                          )}
                          {a.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssignmentStatus(a.id, "COMPLETED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-accent text-white hover:bg-accent-hover"
                            >
                              Complete
                            </button>
                          )}
                          {a.status === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssignmentStatus(a.id, "VERIFIED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-success-tint text-success border border-success/30"
                            >
                              Verify
                            </button>
                          )}

                          {/* Quick Action Modals */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsAssignTechModalOpen(true);
                            }}
                            title="Assign / Add Technician"
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsCustodyModalOpen(true);
                            }}
                            title="Issue Parts / Custody"
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg"
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsAdvanceModalOpen(true);
                            }}
                            title="Issue Cash Advance"
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsConveyanceModalOpen(true);
                            }}
                            title="Submit Conveyance Bill"
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsGpsModalOpen(true);
                            }}
                            title="Log Field GPS Visit"
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssignment(a);
                              setIsPnlModalOpen(true);
                            }}
                            title="View Job P&L Statement"
                            className="p-1 rounded text-primary hover:bg-primary-tint"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>

                          {a.status !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAssignment(a);
                                setIsCloseModalOpen(true);
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-success text-white hover:bg-success-hover flex items-center gap-1"
                              title="Customer Sign-Off & Close"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sign Off</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT CUSTODY */}
      {activeTab === "custody" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-bold text-ink">Parts & Equipment in Technician Custody</h2>
            <button
              type="button"
              onClick={() => {
                if (assignments.length > 0) {
                  setActiveAssignment(assignments[0]);
                  setIsCustodyModalOpen(true);
                } else {
                  addToast("info", "Create a service assignment first to issue custody.");
                }
              }}
              className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Custody</span>
            </button>
          </div>

          <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-body">
              <thead>
                <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                  <th className="py-3 px-4 font-semibold">Product Item</th>
                  <th className="py-3 px-4 font-semibold">Serial #</th>
                  <th className="py-3 px-4 font-semibold">Custodian</th>
                  <th className="py-3 px-4 font-semibold">Qty</th>
                  <th className="py-3 px-4 font-semibold">Issued Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {custodyItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No equipment currently in technician custody.
                    </td>
                  </tr>
                ) : (
                  custodyItems.map((c) => (
                    <tr key={c.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        {c.product?.name || c.productId}
                        <div className="text-caption font-mono text-text-muted">{c.product?.sku}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-caption text-ink">
                        {c.serialNumber?.serialNumber || c.serialNumberId || <span className="text-text-muted italic">Batch</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink">
                          {c.custodian ? `${c.custodian.firstName} ${c.custodian.lastName}` : c.custodianId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{c.quantity}</td>
                      <td className="py-3 px-4 text-caption text-text-muted">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-caption font-semibold px-2 py-0.5 rounded ${
                            c.status === "RETURNED"
                              ? "bg-success-tint text-success"
                              : c.status === "USED"
                              ? "bg-accent-tint text-accent"
                              : c.status === "DAMAGED"
                              ? "bg-danger-tint text-danger"
                              : "bg-warning-tint text-warning"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === "ASSIGNED" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCustodyStatus(c.id, "USED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-accent-tint text-accent hover:bg-accent hover:text-white"
                            >
                              Used
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustodyStatus(c.id, "RETURNED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-success-tint text-success hover:bg-success hover:text-white"
                            >
                              Returned
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustodyStatus(c.id, "DAMAGED")}
                              className="px-2 py-0.5 text-[11px] font-semibold rounded bg-danger-tint text-danger hover:bg-danger hover:text-white"
                            >
                              Damaged
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GPS VISITS */}
      {activeTab === "visits" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-bold text-ink">Field GPS Arrival / Departure Logs</h2>
            <button
              type="button"
              onClick={() => {
                if (assignments.length > 0) {
                  setActiveAssignment(assignments[0]);
                  setIsGpsModalOpen(true);
                } else {
                  addToast("info", "Create a service assignment first to log GPS visits.");
                }
              }}
              className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Record GPS Visit</span>
            </button>
          </div>

          <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-body">
              <thead>
                <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Technician</th>
                  <th className="py-3 px-4 font-semibold">Assignment ID</th>
                  <th className="py-3 px-4 font-semibold">Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {locationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-text-muted">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No field GPS location logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  locationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 text-caption font-mono text-ink">
                        {new Date(log.recordedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink">
                        {log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : log.employeeId}
                      </td>
                      <td className="py-3 px-4 font-mono text-caption text-primary">
                        {log.assignmentId || "-"}
                      </td>
                      <td className="py-3 px-4 font-mono text-caption text-ink">
                        {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FINANCES (ADVANCES & CONVEYANCE BILLS) */}
      {activeTab === "finances" && (
        <div className="space-y-6">
          {/* Section A: Conveyance Bills with Four-Eyes Approval */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-h3 font-bold text-ink">Technician Conveyance Bills</h2>
                <p className="text-caption text-text-muted">
                  Requires four-eyes supervisor verification (claimants cannot approve their own bills).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (assignments.length > 0) {
                    setActiveAssignment(assignments[0]);
                    setIsConveyanceModalOpen(true);
                  } else {
                    addToast("info", "Create a service assignment first to file conveyance bills.");
                  }
                }}
                className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Bill</span>
              </button>
            </div>

            <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                    <th className="py-3 px-4 font-semibold">Bill ID</th>
                    <th className="py-3 px-4 font-semibold">Assignment ID</th>
                    <th className="py-3 px-4 font-semibold">Claimant</th>
                    <th className="py-3 px-4 font-semibold text-right">Claimed (BDT)</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Receipt File</th>
                    <th className="py-3 px-4 font-semibold text-right">Four-Eyes Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {conveyanceBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-muted">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No conveyance bills submitted yet.
                      </td>
                    </tr>
                  ) : (
                    conveyanceBills.map((b) => (
                      <tr key={b.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-primary">{b.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3 px-4 font-mono text-caption text-ink">
                          {b.assignmentId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-ink">
                          {b.technician ? `${b.technician.firstName} ${b.technician.lastName}` : b.employeeId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                          {b.totalClaimed.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-caption font-semibold px-2.5 py-0.5 rounded ${
                              b.approvalStatus === "APPROVED"
                                ? "bg-success-tint text-success"
                                : b.approvalStatus === "REJECTED"
                                ? "bg-danger-tint text-danger"
                                : "bg-warning-tint text-warning"
                            }`}
                          >
                            {b.approvalStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-caption text-text-muted font-mono">
                          {b.receiptFileId || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.approvalStatus === "PENDING" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveConveyance(b.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-success text-white hover:bg-success-hover flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectConveyance(b.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-danger-tint text-danger hover:bg-danger hover:text-white flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Cash Advances */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 font-bold text-ink">Technician Cash Advances</h2>
              <button
                type="button"
                onClick={() => {
                  if (assignments.length > 0) {
                    setActiveAssignment(assignments[0]);
                    setIsAdvanceModalOpen(true);
                  } else {
                    addToast("info", "Create a service assignment first to issue cash advances.");
                  }
                }}
                className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Advance</span>
              </button>
            </div>

            <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                    <th className="py-3 px-4 font-semibold">Advance ID</th>
                    <th className="py-3 px-4 font-semibold">Technician</th>
                    <th className="py-3 px-4 font-semibold">Assignment ID</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount (BDT)</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-muted">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No technician cash advances recorded.
                      </td>
                    </tr>
                  ) : (
                    advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-primary">{adv.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3 px-4 font-semibold text-ink">
                          {adv.technician ? `${adv.technician.firstName} ${adv.technician.lastName}` : adv.employeeId}
                        </td>
                        <td className="py-3 px-4 font-mono text-caption text-ink">
                          {adv.assignmentId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                          {adv.amountIssued.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {new Date(adv.issuedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WARRANTIES & CLAIMS */}
      {activeTab === "warranties" && (
        <div className="space-y-6">
          {/* Section A: Equipment Warranties */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-h3 font-bold text-ink">Serialized Equipment Warranties</h2>
                <p className="text-caption text-text-muted">
                  Active warranty coverage registered to client equipment.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWarrantyModalOpen(true)}
                  className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Warranty</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="px-3 py-1.5 text-caption font-semibold rounded-sm border border-warning text-warning bg-warning-tint/20 hover:bg-warning-tint/40 flex items-center gap-1.5 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>File Claim</span>
                </button>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                    <th className="py-3 px-4 font-semibold">Serial Number</th>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">Coverage Start</th>
                    <th className="py-3 px-4 font-semibold">Coverage End</th>
                    <th className="py-3 px-4 font-semibold">Term</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {warranties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No serialized warranties registered yet.
                      </td>
                    </tr>
                  ) : (
                    warranties.map((w) => (
                      <tr key={w.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {w.serialNumber?.serialNumber || w.serialNumberId}
                        </td>
                        <td className="py-3 px-4 text-ink">
                          {w.serialNumber?.product?.name || "Equipment Model"}
                        </td>
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {new Date(w.startDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {new Date(w.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-caption">{w.termMonths} Mos</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-caption font-semibold px-2 py-0.5 rounded ${
                              w.status === "ACTIVE"
                                ? "bg-success-tint text-success"
                                : w.status === "EXPIRED"
                                ? "bg-page-bg text-text-muted"
                                : "bg-danger-tint text-danger"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Warranty Claims */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-h3 font-bold text-ink">Warranty Claims & Settlements</h2>
            <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-body">
                <thead>
                  <tr className="bg-page-bg/60 border-b border-border text-caption text-text-muted">
                    <th className="py-3 px-4 font-semibold">Claim ID</th>
                    <th className="py-3 px-4 font-semibold">Warranty Asset</th>
                    <th className="py-3 px-4 font-semibold">Service Ticket</th>
                    <th className="py-3 px-4 font-semibold">Outcome</th>
                    <th className="py-3 px-4 font-semibold">Claim Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {warrantyClaims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-muted">
                        <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No warranty claims filed.
                      </td>
                    </tr>
                  ) : (
                    warrantyClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-warning">{claim.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3 px-4 font-mono text-caption text-ink">
                          {claim.warranty?.serialNumber?.serialNumber || claim.warrantyId}
                        </td>
                        <td className="py-3 px-4 font-mono text-caption text-primary">
                          {claim.ticket?.ticketNumber || claim.ticketId}
                        </td>
                        <td className="py-3 px-4 text-caption font-semibold">
                          <span className="px-2 py-0.5 rounded bg-warning-tint text-warning font-mono">
                            {claim.outcome || "PENDING"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {new Date(claim.raisedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Create Ticket Modal */}
      <CreateServiceTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSuccess={(ticket) => {
          setTickets((prev) => [ticket, ...prev]);
          addToast("success", `Ticket ${ticket.ticketNumber} created successfully!`);
          fetchData();
        }}
        branches={branches}
        customers={customers}
        defaultBranchId={selectedBranchId}
      />

      {/* 2. Create Quotation Modal */}
      <CreateServiceQuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setSelectedTicketForQuote(null);
        }}
        onSuccess={() => {
          addToast("success", "Service quotation created successfully!");
          fetchData();
        }}
        ticket={selectedTicketForQuote}
      />

      {/* 3. Create Service Assignment Modal */}
      <CreateServiceAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setAssignmentPreselectTicketId(undefined);
        }}
        onSuccess={(assignment) => {
          setAssignments((prev) => [assignment, ...prev]);
          addToast("success", `Assignment ${assignment.assignmentNumber} scheduled!`);
          fetchData();
        }}
        branches={branches}
        tickets={tickets.filter((t) => t.status !== "CLOSED")}
        defaultBranchId={selectedBranchId}
        defaultTicketId={assignmentPreselectTicketId}
      />

      {/* 4. Assign Technician Modal */}
      <AssignTechnicianModal
        isOpen={isAssignTechModalOpen}
        onClose={() => {
          setIsAssignTechModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={(updated) => {
          setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          addToast("success", "Technician assigned to field order!");
          fetchData();
        }}
        assignment={activeAssignment}
        employees={employees}
      />

      {/* 5. Issue Custody Modal */}
      <IssueProductCustodyModal
        isOpen={isCustodyModalOpen}
        onClose={() => {
          setIsCustodyModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={(custody) => {
          setCustodyItems((prev) => [custody, ...prev]);
          addToast("success", "Product custody successfully issued!");
          fetchData();
        }}
        assignment={activeAssignment}
        products={products}
        employees={employees}
      />

      {/* 6. Issue Technician Advance Modal */}
      <IssueTechnicianAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => {
          setIsAdvanceModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={(adv) => {
          setAdvances((prev) => [adv, ...prev]);
          addToast("success", "Advance issued successfully!");
          fetchData();
        }}
        assignment={activeAssignment}
        employees={employees}
      />

      {/* 7. Submit Conveyance Bill Modal */}
      <SubmitConveyanceBillModal
        isOpen={isConveyanceModalOpen}
        onClose={() => {
          setIsConveyanceModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={(bill) => {
          setConveyanceBills((prev) => [bill, ...prev]);
          addToast("success", "Conveyance claim submitted!");
          fetchData();
        }}
        assignment={activeAssignment}
        employees={employees}
      />

      {/* 8. Record GPS Checkin Modal */}
      <RecordGpsCheckinModal
        isOpen={isGpsModalOpen}
        onClose={() => {
          setIsGpsModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={() => {
          addToast("success", "GPS visit recorded successfully!");
          fetchData();
        }}
        assignment={activeAssignment}
        employees={employees}
      />

      {/* 9. Close Service Assignment Modal */}
      <CloseServiceAssignmentModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setActiveAssignment(null);
        }}
        onSuccess={() => {
          addToast("success", "Project closed and sign-off recorded!");
          fetchData();
        }}
        assignment={activeAssignment}
      />

      {/* 10. Service P&L Modal */}
      <ServicePnlModal
        isOpen={isPnlModalOpen}
        onClose={() => {
          setIsPnlModalOpen(false);
          setActiveAssignment(null);
        }}
        assignment={activeAssignment}
      />

      {/* 11. Create Warranty Modal */}
      <CreateWarrantyModal
        isOpen={isWarrantyModalOpen}
        onClose={() => setIsWarrantyModalOpen(false)}
        onSuccess={(w) => {
          setWarranties((prev) => [w, ...prev]);
          addToast("success", "Warranty registered successfully!");
          fetchData();
        }}
      />

      {/* 12. Create Warranty Claim Modal */}
      <CreateWarrantyClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={(claim) => {
          setWarrantyClaims((prev) => [claim, ...prev]);
          addToast("success", "Warranty claim filed successfully!");
          fetchData();
        }}
        warranties={warranties.filter((w) => w.status === "ACTIVE")}
        tickets={tickets.filter((t) => t.ticketType === "WARRANTY_CLAIM")}
      />
    </div>
  );
};
