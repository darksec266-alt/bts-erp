"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  ShoppingCart,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  FileCheck,
  Briefcase,
  Zap,
  MapPin,
  ArrowDownLeft,
  FileMinus,
  Undo2,
  PackageCheck,
  RotateCcw,
  Wallet,
  DollarSign,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  QuotationDto,
  SalesOrderDto,
  DeliveryChallanDto,
  InvoiceDto,
  BranchDto,
  CustomerDto,
  SalesStatsDto,
  QuotationStatus,
  ProductDto,
  ProjectDto,
  DirectSaleResultDto,
  CustomerAdvanceDto,
  PaymentDto,
  CreditNoteDto,
  DeliveryChallanReturnDto,
  SalesReturnDto,
} from "@bts/shared-types";
import { CreateQuotationModal } from "./CreateQuotationModal";
import { QuotationDetailDrawer } from "./QuotationDetailDrawer";
import { CreateSalesOrderModal } from "./CreateSalesOrderModal";
import { SalesOrderDetailDrawer } from "./SalesOrderDetailDrawer";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
import { DirectSaleModal } from "./DirectSaleModal";
import { CreateCustomerAdvanceModal } from "./CreateCustomerAdvanceModal";
import { AdjustAdvanceModal } from "./AdjustAdvanceModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreateCreditNoteModal } from "./CreateCreditNoteModal";
import { CreateChallanReturnModal } from "./CreateChallanReturnModal";
import { CreateSalesReturnModal } from "./CreateSalesReturnModal";
import { OrderFulfillmentModal } from "./OrderFulfillmentModal";
import { ToastContainer, type ToastMessage } from "../common/Toast";

export type SalesTab =
  | "quotations"
  | "orders"
  | "projects"
  | "challans"
  | "invoices"
  | "advances"
  | "payments"
  | "credit-notes"
  | "returns";

interface SalesModuleProps {
  selectedBranchId?: string;
  initialTab?: SalesTab;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ selectedBranchId, initialTab }) => {
  const [activeTab, setActiveTab] = useState<SalesTab>(
    initialTab || "quotations"
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: SalesTab) => {
    setActiveTab(tab);
    setPage(1);
    if (typeof window !== "undefined") {
      const url = tab === "quotations" ? "/sales" : `/sales?tab=${tab}`;
      window.history.pushState(null, "", url);
    }
  };

  // Master Data dependencies
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);

  // Stats
  const [stats, setStats] = useState<SalesStatsDto>({
    totalRevenue: 0,
    totalOrders: 0,
    totalQuotations: 0,
    pendingQuotations: 0,
    acceptedQuotations: 0,
    dispatchedChallans: 0,
    totalInvoices: 0,
    unbilledChallans: 0,
  });

  // Quotations State
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [quotationsTotal, setQuotationsTotal] = useState(0);

  // Sales Orders State
  const [orders, setOrders] = useState<SalesOrderDto[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Projects State (Long-Term Projects & Site Challans)
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [selectedProject, setSelectedProject] = useState<ProjectDto | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  // Direct Sale State
  const [directSaleModalOpen, setDirectSaleModalOpen] = useState(false);

  // Challans State
  const [challans, setChallans] = useState<DeliveryChallanDto[]>([]);
  const [challansTotal, setChallansTotal] = useState(0);
  const [challanBillingFilter, setChallanBillingFilter] = useState<"ALL" | "UNBILLED" | "BILLED">("ALL");

  // Invoices State
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [invoicesTotal, setInvoicesTotal] = useState(0);

  // Customer Advances State
  const [advances, setAdvances] = useState<CustomerAdvanceDto[]>([]);
  const [advancesTotal, setAdvancesTotal] = useState(0);
  const [createAdvanceModalOpen, setCreateAdvanceModalOpen] = useState(false);
  const [adjustAdvanceModalOpen, setAdjustAdvanceModalOpen] = useState(false);
  const [selectedAdvanceForAdjust, setSelectedAdvanceForAdjust] = useState<CustomerAdvanceDto | null>(null);

  // Payments & Collections State
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [defaultInvoiceForPayment, setDefaultInvoiceForPayment] = useState<string | undefined>(undefined);

  // Credit Notes State
  const [creditNotes, setCreditNotes] = useState<CreditNoteDto[]>([]);
  const [creditNotesTotal, setCreditNotesTotal] = useState(0);
  const [createCreditNoteModalOpen, setCreateCreditNoteModalOpen] = useState(false);
  const [defaultInvoiceForCreditNote, setDefaultInvoiceForCreditNote] = useState<string | undefined>(undefined);

  // Delivery Challan Returns State
  const [challanReturns, setChallanReturns] = useState<DeliveryChallanReturnDto[]>([]);
  const [challanReturnsTotal, setChallanReturnsTotal] = useState(0);
  const [createChallanReturnModalOpen, setCreateChallanReturnModalOpen] = useState(false);
  const [defaultChallanForReturn, setDefaultChallanForReturn] = useState<DeliveryChallanDto | null>(null);

  // Sales Returns State (Invoice-wise Customer Returns with Wallet Credit)
  const [salesReturns, setSalesReturns] = useState<SalesReturnDto[]>([]);
  const [salesReturnsTotal, setSalesReturnsTotal] = useState(0);
  const [createSalesReturnModalOpen, setCreateSalesReturnModalOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<InvoiceDto | null>(null);
  const [returnsSubTab, setReturnsSubTab] = useState<"sales_returns" | "challan_returns">("sales_returns");

  // Order Fulfillment State
  const [fulfillmentModalOpen, setFulfillmentModalOpen] = useState(false);
  const [fulfillmentOrderId, setFulfillmentOrderId] = useState("");
  const [fulfillmentOrderNumber, setFulfillmentOrderNumber] = useState("");

  // Loading
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(selectedBranchId || "");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "ALL">("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Drawers
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuotationDto | null>(null);
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false);

  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderDto | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [preSelectedOrderForInvoice, setPreSelectedOrderForInvoice] = useState<string | undefined>(undefined);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync external branch
  useEffect(() => {
    if (selectedBranchId !== undefined) {
      setBranchFilter(selectedBranchId);
      setPage(1);
    }
  }, [selectedBranchId]);

  // Load auxiliary data
  useEffect(() => {
    const loadAux = async () => {
      try {
        const [bRes, cRes, pRes] = await Promise.all([
          api.getBranches(),
          api.getCustomers({ take: 300 }),
          api.getProducts({ take: 300 }),
        ]);
        setBranches(bRes.items || []);
        setCustomers(cRes.items || []);
        setProducts(pRes.items || []);
      } catch (err) {
        console.error("Auxiliary data load failed:", err);
      }
    };
    loadAux();
  }, []);

  // Fetch Stats & Data
  const fetchData = useCallback(async () => {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Stats
      api.getSalesStats(branchFilter || undefined).then(setStats).catch(() => {});

      if (activeTab === "quotations") {
        const res = await api.getQuotations({
          branchId: branchFilter || undefined,
          status: statusFilter,
          search: search.trim() || undefined,
          skip,
          take,
        });
        setQuotations(res.items || []);
        setQuotationsTotal(res.total || 0);
      } else if (activeTab === "orders") {
        const res = await api.getSalesOrders({
          branchId: branchFilter || undefined,
          search: search.trim() || undefined,
          skip,
          take,
        });
        setOrders(res.items || []);
        setOrdersTotal(res.total || 0);
      } else if (activeTab === "projects") {
        const res = await api.getProjects({
          branchId: branchFilter || undefined,
          search: search.trim() || undefined,
          skip,
          take,
        });
        setProjects(res.items || []);
        setProjectsTotal(res.total || 0);
      } else if (activeTab === "challans") {
        const res = await api.getDeliveryChallans({
          branchId: branchFilter || undefined,
          billingStatus: challanBillingFilter !== "ALL" ? challanBillingFilter : undefined,
          search: search.trim() || undefined,
          skip,
          take,
        });
        setChallans(res.items || []);
        setChallansTotal(res.total || 0);
      } else if (activeTab === "invoices") {
        const res = await api.getInvoices({
          branchId: branchFilter || undefined,
          search: search.trim() || undefined,
          skip,
          take,
        });
        setInvoices(res.items || []);
        setInvoicesTotal(res.total || 0);
      } else if (activeTab === "advances") {
        const res = await api.getCustomerAdvances({
          branchId: branchFilter || undefined,
          skip,
          take,
        });
        setAdvances(res.items || []);
        setAdvancesTotal(res.total || 0);
      } else if (activeTab === "payments") {
        const res = await api.getPayments({
          skip,
          take,
        });
        setPayments(res.items || []);
        setPaymentsTotal(res.total || 0);
      } else if (activeTab === "credit-notes") {
        const res = await api.getCreditNotes({
          skip,
          take,
        });
        setCreditNotes(res.items || []);
        setCreditNotesTotal(res.total || 0);
      } else if (activeTab === "returns") {
        if (returnsSubTab === "sales_returns") {
          const res = await api.getSalesReturns({
            branchId: branchFilter || undefined,
            skip,
            take,
          });
          setSalesReturns(res.items || []);
          setSalesReturnsTotal(res.total || 0);
        } else {
          const res = await api.getChallanReturns({
            skip,
            take,
          });
          setChallanReturns(res.items || []);
          setChallanReturnsTotal(res.total || 0);
        }
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to load sales data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, returnsSubTab, branchFilter, statusFilter, challanBillingFilter, search, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleQuotationCreated = (created: QuotationDto) => {
    addToast("success", `Quotation ${created.quotationNumber} drafted successfully.`);
    fetchData();
  };

  const handleQuotationUpdated = (updated: QuotationDto) => {
    addToast("success", `Quotation ${updated.quotationNumber} updated to ${updated.status}.`);
    setSelectedQuote(updated);
    fetchData();
  };

  const handleOrderCreated = (created: SalesOrderDto) => {
    addToast("success", `Sales Order ${created.orderNumber} confirmed.`);
    fetchData();
  };

  const handleQuotationConverted = (orderId: string) => {
    addToast("success", "Quotation converted to Sales Order successfully!");
    setActiveTab("orders");
    fetchData();
    api.getSalesOrder(orderId).then((ord) => {
      setSelectedOrder(ord);
      setOrderDrawerOpen(true);
    });
  };

  const handleProjectCreated = (created: ProjectDto) => {
    addToast("success", `Project ${created.projectCode} (${created.name}) created successfully.`);
    setActiveTab("projects");
    fetchData();
    setSelectedProject(created);
    setProjectDrawerOpen(true);
  };

  const handleDirectSaleSuccess = (result: DirectSaleResultDto) => {
    addToast("success", `Direct Sale completed! Commercial Invoice ${result.invoice.invoiceNumber} generated.`);
    fetchData();
    api.getProducts({ take: 100 }).then((r) => setProducts(r.items || [])).catch(() => {});
  };

  const handleChallanDispatched = (challan: DeliveryChallanDto) => {
    addToast("success", `Challan ${challan.challanNumber} dispatched successfully!`);
    fetchData();
    api.getProducts({ take: 100 }).then((r) => setProducts(r.items || [])).catch(() => {});
  };

  const handleInvoiceCreated = (created: InvoiceDto) => {
    addToast("success", `Commercial Bill ${created.invoiceNumber} created successfully!`);
    setActiveTab("invoices");
    fetchData();
    api.getInvoice(created.id).then((fullInv) => {
      setSelectedInvoice(fullInv);
      setInvoiceDrawerOpen(true);
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = "sales-export.csv";

    if (activeTab === "quotations") {
      filename = `quotations-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Quotation Number", "Customer", "Branch", "Status", "Valid Until", "Grand Total (BDT)"];
      rows = quotations.map((q) => [
        q.quotationNumber,
        q.customer?.displayName || "N/A",
        q.branch?.name || "N/A",
        q.status,
        new Date(q.validUntil).toLocaleDateString(),
        q.grandTotal,
      ]);
    } else if (activeTab === "orders") {
      filename = `sales-orders-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Order Number", "Customer", "Branch", "Origin Quote", "Date", "Grand Total (BDT)"];
      rows = orders.map((o) => [
        o.orderNumber,
        o.customer?.displayName || "N/A",
        o.branch?.name || "N/A",
        o.quotation?.quotationNumber || "Direct",
        new Date(o.createdAt).toLocaleDateString(),
        o.grandTotal,
      ]);
    } else if (activeTab === "projects") {
      filename = `projects-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Project Code", "Name", "Customer", "Branch", "Status", "Budget (BDT)", "Dispatched (BDT)", "Invoiced (BDT)"];
      rows = projects.map((p) => [
        p.projectCode,
        p.name,
        p.customer?.displayName || "N/A",
        p.branch?.name || "N/A",
        p.status,
        p.budgetAmount || 0,
        p.totalDispatchedAmount || 0,
        p.totalInvoicedAmount || 0,
      ]);
    } else if (activeTab === "challans") {
      filename = `delivery-challans-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Challan Number", "Order Number", "Customer", "Dispatched Date", "Items Count", "Billing Status"];
      rows = challans.map((c) => [
        c.challanNumber,
        c.salesOrder?.orderNumber || "N/A",
        c.salesOrder?.customer?.displayName || "N/A",
        new Date(c.dispatchedAt).toLocaleDateString(),
        c.lines.length,
        c.billingStatus || "UNBILLED",
      ]);
    } else if (activeTab === "invoices") {
      filename = `commercial-bills-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Invoice Number", "Customer", "Branch", "Date", "Status", "Challans Count", "Grand Total (BDT)"];
      rows = invoices.map((inv) => [
        inv.invoiceNumber,
        inv.customer?.displayName || "N/A",
        inv.branch?.name || "N/A",
        new Date(inv.createdAt).toLocaleDateString(),
        inv.status,
        (inv.challans || []).length,
        inv.grandTotal,
      ]);
    } else if (activeTab === "advances") {
      filename = `customer-advances-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Advance ID", "Customer", "Branch", "Receipt Date", "Mode", "Reference #", "Total Amount (BDT)", "Adjusted (BDT)", "Remaining Balance (BDT)", "Status"];
      rows = advances.map((a) => [
        `#ADV-${a.id.slice(-6).toUpperCase()}`,
        a.customer?.displayName || "N/A",
        a.branch?.name || "N/A",
        new Date(a.receivedDate).toLocaleDateString(),
        a.method,
        a.projectRef || "N/A",
        a.amount,
        a.adjustedAmount ?? 0,
        a.remainingAmount ?? (a.amount - (a.adjustedAmount ?? 0)),
        a.status,
      ]);
    } else if (activeTab === "payments") {
      filename = `sales-payments-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Receipt #", "Invoice #", "Customer", "Date", "Mode", "Transaction Ref", "Amount (BDT)"];
      rows = payments.map((p) => [
        `#RCP-${p.id.slice(-6).toUpperCase()}`,
        p.invoice?.invoiceNumber || "N/A",
        p.invoice?.customer?.displayName || "N/A",
        new Date(p.receivedAt).toLocaleDateString(),
        p.method,
        p.gatewayTransactionId || "N/A",
        p.amount,
      ]);
    } else if (activeTab === "credit-notes") {
      filename = `credit-notes-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Credit Note #", "Invoice #", "Customer", "Issue Date", "Reason", "Amount (BDT)"];
      rows = creditNotes.map((cn) => [
        cn.creditNoteNumber,
        cn.invoice?.invoiceNumber || "N/A",
        cn.invoice?.customer?.displayName || "N/A",
        new Date(cn.createdAt).toLocaleDateString(),
        cn.reason,
        cn.amount,
      ]);
    } else if (activeTab === "returns") {
      filename = `challan-returns-${new Date().toISOString().split("T")[0]}.csv`;
      headers = ["Return Number", "Challan #", "Customer", "Return Date", "Items Returned Count", "Condition"];
      rows = challanReturns.map((cr) => [
        cr.returnNumber,
        cr.challan?.challanNumber || "N/A",
        cr.challan?.salesOrder?.customer?.displayName || "N/A",
        new Date(cr.createdAt).toLocaleDateString(),
        cr.lines?.length || 0,
        cr.lines?.map((l) => `${l.quantity}x (${l.condition})`).join("; ") || "GOOD",
      ]);
    }

    if (rows.length === 0) {
      addToast("info", "No records available to export.");
      return;
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", `Exported ${rows.length} records to ${filename}`);
  };

  const totalCount =
    activeTab === "quotations"
      ? quotationsTotal
      : activeTab === "orders"
      ? ordersTotal
      : activeTab === "projects"
      ? projectsTotal
      : activeTab === "challans"
      ? challansTotal
      : activeTab === "invoices"
      ? invoicesTotal
      : activeTab === "advances"
      ? advancesTotal
      : activeTab === "payments"
      ? paymentsTotal
      : activeTab === "credit-notes"
      ? creditNotesTotal
      : returnsSubTab === "sales_returns"
      ? salesReturnsTotal
      : challanReturnsTotal;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">Sales</h1>
          <p className="text-[13px] text-text-muted mt-0.5">Quotations, orders, challans, invoices, and payments.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            className="p-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            Export
          </button>

          <button
            onClick={() => setDirectSaleModalOpen(true)}
            className="px-3.5 py-2 rounded-sm bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
            title="Counter direct sale with instant invoice"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Direct Sale
          </button>

          {activeTab === "quotations" && (
            <button
              onClick={() => setCreateQuoteModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Quotation
            </button>
          )}

          {activeTab === "orders" && (
            <button
              onClick={() => setCreateOrderModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Order
            </button>
          )}

          {activeTab === "projects" && (
            <button
              onClick={() => setCreateProjectModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}

          {(activeTab === "challans" || activeTab === "invoices") && (
            <button
              onClick={() => {
                setPreSelectedOrderForInvoice(undefined);
                setCreateInvoiceModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </button>
          )}

          {activeTab === "advances" && (
            <button
              onClick={() => setCreateAdvanceModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Advance
            </button>
          )}

          {activeTab === "payments" && (
            <button
              onClick={() => {
                setDefaultInvoiceForPayment(undefined);
                setRecordPaymentModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}

          {activeTab === "credit-notes" && (
            <button
              onClick={() => {
                setDefaultInvoiceForCreditNote(undefined);
                setCreateCreditNoteModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Issue Credit Note
            </button>
          )}

          {activeTab === "returns" && (
            <button
              onClick={() => {
                setDefaultChallanForReturn(null);
                setCreateChallanReturnModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Return
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Revenue</p>
            <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
              ৳{stats.totalRevenue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Confirmed
            </p>
          </div>
          <div className="w-9 h-9 rounded-sm bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Orders</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.totalOrders}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Active</p>
          </div>
          <div className="w-9 h-9 rounded-sm bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Challans</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.dispatchedChallans}</p>
            <p className="text-[11px] text-warning font-medium mt-0.5">
              {stats.unbilledChallans !== undefined ? `${stats.unbilledChallans} unbilled` : "Dispatched"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-sm bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Invoices</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.totalInvoices ?? invoicesTotal}</p>
            <p className="text-[11px] text-primary font-medium mt-0.5">Commercial</p>
          </div>
          <div className="w-9 h-9 rounded-sm bg-purple/10 text-purple flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-md border border-border bg-surface shadow-elevation-1 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder={`Search ${activeTab} by reference, customer name...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            {/* Quotation Status Filter */}
            {activeTab === "quotations" && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as QuotationStatus | "ALL");
                  setPage(1);
                }}
                className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent to Client</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="CONVERTED">Converted to Order</option>
                <option value="EXPIRED">Expired</option>
              </select>
            )}

            {/* Challan Billing Filter */}
            {activeTab === "challans" && (
              <select
                value={challanBillingFilter}
                onChange={(e) => {
                  setChallanBillingFilter(e.target.value as "ALL" | "UNBILLED" | "BILLED");
                  setPage(1);
                }}
                className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
              >
                <option value="ALL">All Billing Status</option>
                <option value="UNBILLED">Pending Bill (Unbilled)</option>
                <option value="BILLED">Billed</option>
              </select>
            )}

            {(search || branchFilter || (activeTab === "quotations" && statusFilter !== "ALL") || (activeTab === "challans" && challanBillingFilter !== "ALL")) && (
              <button
                onClick={() => {
                  setSearch("");
                  setBranchFilter("");
                  setStatusFilter("ALL");
                  setChallanBillingFilter("ALL");
                  setPage(1);
                }}
                className="px-3 py-2 text-caption font-medium rounded-sm border border-danger/30 text-danger hover:bg-danger-tint transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto text-primary animate-spin" />
            <p className="text-[13px] text-text-muted">Loading...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: QUOTATIONS TABLE */}
            {activeTab === "quotations" && (
              <>
                {quotations.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <FileText className="w-10 h-10 mx-auto text-text-muted/30" />
                    <h3 className="text-[15px] font-semibold text-ink">No quotations found</h3>
                    <p className="text-[13px] text-text-muted">
                      {search || branchFilter || statusFilter !== "ALL"
                        ? "No results match your filters."
                        : "No quotations yet. Create the first one to begin the sales workflow."}
                    </p>
                    {!(search || branchFilter || statusFilter !== "ALL") && (
                      <button
                        onClick={() => setCreateQuoteModalOpen(true)}
                        className="px-4 py-2 mt-1 rounded-sm bg-primary text-white text-[13px] font-medium hover:bg-primary-hover inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Quotation
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Quotation #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Operating Branch</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Valid Until</th>
                          <th className="py-3 px-4 text-right">Grand Total (৳)</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quotations.map((q) => (
                          <tr key={q.id} className="hover:bg-page-bg/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-ink">{q.quotationNumber}</span>
                              <span className="text-[11px] text-text-muted block">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-ink leading-tight">
                                {q.customer?.displayName || "N/A"}
                              </p>
                              <span className="text-[11px] text-text-muted font-mono">
                                {q.customer?.customerCode}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-body text-ink">
                                {q.branch?.name || "Head Office"}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  q.status === "DRAFT"
                                    ? "bg-page-bg text-text-muted border-border"
                                    : q.status === "SENT"
                                    ? "bg-primary-tint text-primary border-primary/20"
                                    : q.status === "ACCEPTED"
                                    ? "bg-success-tint text-success border-success/20"
                                    : q.status === "REJECTED"
                                    ? "bg-danger-tint text-danger border-danger/20"
                                    : q.status === "CONVERTED"
                                    ? "bg-purple-tint text-purple border-purple/20"
                                    : "bg-warning-tint text-warning border-warning/20"
                                }`}
                              >
                                {q.status}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-caption text-text-muted">
                              {new Date(q.validUntil).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                              ৳{q.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedQuote(q);
                                  setQuoteDrawerOpen(true);
                                }}
                                className="px-3 py-1.5 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink inline-flex items-center gap-1.5 transition-colors shadow-elevation-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-text-muted" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: SALES ORDERS TABLE */}
            {activeTab === "orders" && (
              <>
                {orders.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <ShoppingCart className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Sales Orders Found</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      No confirmed sales orders found. Convert an accepted quotation or create a direct sales order.
                    </p>
                    <button
                      onClick={() => setCreateOrderModalOpen(true)}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Direct Order</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Order #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4">Origin Quotation</th>
                          <th className="py-3 px-4">Order Date</th>
                          <th className="py-3 px-4 text-right">Grand Total (৳)</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orders.map((o) => (
                          <tr key={o.id} className="hover:bg-page-bg/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-ink">{o.orderNumber}</span>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-ink leading-tight">
                                {o.customer?.displayName || "N/A"}
                              </p>
                              <span className="text-[11px] text-text-muted font-mono">
                                {o.customer?.customerCode}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-body text-ink">
                                {o.branch?.name || "Head Office"}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono text-caption">
                              {o.quotation ? (
                                <span className="text-purple bg-purple-tint px-2 py-0.5 rounded border border-purple/20">
                                  {o.quotation.quotationNumber}
                                </span>
                              ) : (
                                <span className="text-text-muted">Direct Order</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-caption text-text-muted">
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                              ৳{o.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setFulfillmentOrderId(o.id);
                                    setFulfillmentOrderNumber(o.orderNumber);
                                    setFulfillmentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 text-caption font-medium rounded-sm border border-primary/20 bg-primary-tint hover:bg-primary/20 text-primary inline-flex items-center gap-1 transition-colors"
                                  title="View Order Fulfillment & Delivery Status"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>Fulfillment</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setOrderDrawerOpen(true);
                                  }}
                                  className="px-3 py-1.5 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink inline-flex items-center gap-1.5 transition-colors shadow-elevation-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-text-muted" />
                                  <span>Details & Dispatch</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB: PROJECTS TABLE */}
            {activeTab === "projects" && (
              <>
                {projects.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <Briefcase className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Project Contracts Found</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      Create long-term client projects to manage multi-phased deliveries via continuous delivery challans and consolidated billing.
                    </p>
                    <button
                      onClick={() => setCreateProjectModalOpen(true)}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Project Contract</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Project Code</th>
                          <th className="py-3 px-4">Project Name & Scope</th>
                          <th className="py-3 px-4">Customer & Site Location</th>
                          <th className="py-3 px-4">Timeline</th>
                          <th className="py-3 px-4 text-right">Budget (BDT)</th>
                          <th className="py-3 px-4 text-right">Dispatched Value</th>
                          <th className="py-3 px-4 text-right">Invoiced (BDT)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {projects.map((p) => {
                          const progress = Number(p.fulfillmentProgress || 0);
                          const budget = Number(p.budgetAmount || 0);
                          const dispatched = Number(p.totalDispatchedAmount || 0);
                          const invoiced = Number(p.totalInvoicedAmount || 0);
                          return (
                            <tr key={p.id} className="hover:bg-page-bg/40 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-ink">{p.projectCode}</span>
                                <span className="text-[11px] text-text-muted block">
                                  {p.branch?.name || "Branch"}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-semibold text-ink leading-tight">{p.name}</p>
                                <span className="text-[11px] text-text-muted">
                                  {p.items?.length || 0} planned materials
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-semibold text-ink leading-tight">
                                  {p.customer?.displayName || "N/A"}
                                </p>
                                {p.siteLocation && (
                                  <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                                    <span className="truncate max-w-xs">{p.siteLocation}</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-caption text-text-muted">
                                <div>{p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}</div>
                                <div className="text-[11px] text-text-muted/70">
                                  to {p.endDate ? new Date(p.endDate).toLocaleDateString() : "Ongoing"}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                                ৳{budget.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <span className="font-mono font-bold text-primary block">
                                  ৳{dispatched.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                </span>
                                <div className="w-24 ml-auto h-1.5 bg-page-bg rounded-full overflow-hidden border border-border mt-1">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-text-muted font-mono">{progress.toFixed(0)}% shipped</span>
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-bold text-success">
                                ৳{invoiced.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    p.status === "ACTIVE"
                                      ? "bg-success-tint text-success border border-success/20"
                                      : p.status === "COMPLETED"
                                      ? "bg-primary-tint text-primary border border-primary/20"
                                      : p.status === "ON_HOLD"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-surface text-text-muted border border-border"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedProject(p);
                                    setProjectDrawerOpen(true);
                                  }}
                                  className="px-3 py-1.5 text-caption font-semibold rounded-sm bg-primary-tint text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 transition-colors shadow-elevation-1"
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                  <span>Manage & Challans</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: DELIVERY CHALLANS TABLE */}
            {activeTab === "challans" && (
              <>
                {challans.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <Truck className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Delivery Challans Dispatched</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      Delivery challans document physical product movement from the warehouse to the customer project site. Dispatch a challan from a confirmed sales order.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Challan Number</th>
                          <th className="py-3 px-4">Associated Sales Order</th>
                          <th className="py-3 px-4">Customer Destination</th>
                          <th className="py-3 px-4">Dispatched At</th>
                          <th className="py-3 px-4 text-center">Items Dispatched</th>
                          <th className="py-3 px-4 text-center">Billing Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {challans.map((ch) => {
                          const isBilled = ch.billingStatus === "BILLED" || ch.invoiceId != null;
                          return (
                            <tr key={ch.id} className="hover:bg-page-bg/40 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-ink">{ch.challanNumber}</span>
                              </td>

                              <td className="py-3 px-4 font-mono font-medium text-primary">
                                {ch.salesOrder?.orderNumber || "N/A"}
                              </td>

                              <td className="py-3 px-4 font-medium text-ink">
                                {ch.salesOrder?.customer?.displayName || "N/A"}
                              </td>

                              <td className="py-3 px-4 text-caption text-text-muted">
                                {new Date(ch.dispatchedAt).toLocaleString()}
                              </td>

                              <td className="py-3 px-4 text-center font-mono font-medium">
                                {ch.lines.length} items
                              </td>

                              <td className="py-3 px-4 text-center">
                                {isBilled ? (
                                  <div>
                                    <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20">
                                      BILLED
                                    </span>
                                    {ch.invoice && (
                                      <span className="text-[11px] font-mono text-text-muted block mt-0.5">
                                        {ch.invoice.invoiceNumber}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-semibold text-warning px-2 py-0.5 rounded-full bg-warning-tint border border-warning/20">
                                    PENDING BILL
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setDefaultChallanForReturn(ch);
                                      setCreateChallanReturnModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-caption font-medium rounded-sm border border-warning/30 bg-warning-tint hover:bg-warning/20 text-warning inline-flex items-center gap-1 transition-colors"
                                    title="Return Items from this Delivery Challan"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                    <span>Return</span>
                                  </button>
                                  {isBilled && ch.invoiceId ? (
                                    <button
                                      onClick={() => {
                                        api.getInvoice(ch.invoiceId!).then((inv) => {
                                          setSelectedInvoice(inv);
                                          setInvoiceDrawerOpen(true);
                                        });
                                      }}
                                      className="px-2.5 py-1 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink inline-flex items-center gap-1 transition-colors shadow-elevation-1"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-text-muted" />
                                      <span>View Bill</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setPreSelectedOrderForInvoice(ch.salesOrderId);
                                        setCreateInvoiceModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover inline-flex items-center gap-1 transition-colors shadow-sm"
                                    >
                                      <FileCheck className="w-3.5 h-3.5" />
                                      <span>Bill Now</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 4: INVOICES & BILLING TABLE */}
            {activeTab === "invoices" && (
              <>
                {invoices.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <FileCheck className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Commercial Bills / Invoices Generated</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      Consolidate single or multiple delivery challans from long-running client projects into a single commercial bill.
                    </p>
                    <button
                      onClick={() => {
                        setPreSelectedOrderForInvoice(undefined);
                        setCreateInvoiceModalOpen(true);
                      }}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Consolidated Bill</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4">Consolidated Challans</th>
                          <th className="py-3 px-4">Billing Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Grand Total (৳)</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-page-bg/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-ink">{inv.invoiceNumber}</span>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-ink leading-tight">
                                {inv.customer?.displayName || "N/A"}
                              </p>
                              <span className="text-[11px] text-text-muted font-mono">
                                {inv.customer?.customerCode}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-body text-ink">
                                {inv.branch?.name || "Head Office"}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {(inv.challans && inv.challans.length > 0) ? (
                                  inv.challans.map((c) => (
                                    <span
                                      key={c.id}
                                      className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20"
                                    >
                                      {c.challanNumber}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-caption text-text-muted">None directly linked</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-caption text-text-muted">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20">
                                {inv.status}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                              ৳{inv.grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setDefaultInvoiceForPayment(inv.id);
                                    setRecordPaymentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-caption font-medium rounded-sm border border-success/30 bg-success-tint hover:bg-success/20 text-success inline-flex items-center gap-1 transition-colors"
                                  title="Record Payment / Collection for this invoice"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Collect</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDefaultInvoiceForCreditNote(inv.id);
                                    setCreateCreditNoteModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-caption font-medium rounded-sm border border-danger/30 bg-danger-tint hover:bg-danger/20 text-danger inline-flex items-center gap-1 transition-colors"
                                  title="Issue Credit Note against this invoice"
                                >
                                  <FileMinus className="w-3.5 h-3.5" />
                                  <span>Credit Note</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceForReturn(inv);
                                    setCreateSalesReturnModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-caption font-medium rounded-sm border border-warning/30 bg-warning-tint hover:bg-warning/20 text-warning inline-flex items-center gap-1 transition-colors"
                                  title="Process Sales Return (restores inventory & credits customer wallet)"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span>Return</span>
                                </button>
                                <button
                                  onClick={() => {
                                    api.getInvoice(inv.id).then((fullInv) => {
                                      setSelectedInvoice(fullInv);
                                      setInvoiceDrawerOpen(true);
                                    });
                                  }}
                                  className="px-3 py-1.5 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink inline-flex items-center gap-1.5 transition-colors shadow-elevation-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-text-muted" />
                                  <span>View Bill</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 5: CUSTOMER ADVANCES TABLE */}
            {activeTab === "advances" && (
              <>
                {advances.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <ArrowDownLeft className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Customer Advances Found</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      No customer prepayment or advance deposits recorded. When clients pay upfront before project delivery or commercial billing, record the advance receipt here.
                    </p>
                    <button
                      onClick={() => setCreateAdvanceModalOpen(true)}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Customer Advance</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Advance #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4">Receipt Date</th>
                          <th className="py-3 px-4">Mode & Ref</th>
                          <th className="py-3 px-4 text-right">Advance Amount (৳)</th>
                          <th className="py-3 px-4 text-right">Adjusted (৳)</th>
                          <th className="py-3 px-4 text-right">Remaining Balance (৳)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {advances.map((adv) => {
                          const remaining = adv.remainingAmount ?? (adv.amount - (adv.adjustedAmount ?? 0));
                          return (
                            <tr key={adv.id} className="hover:bg-page-bg/40 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-ink">#ADV-{adv.id.slice(-6).toUpperCase()}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-ink leading-tight">{adv.customer?.displayName || "N/A"}</p>
                                <span className="text-[11px] text-text-muted font-mono">{adv.customer?.customerCode}</span>
                              </td>
                              <td className="py-3 px-4 text-text-muted">{adv.branch?.name || "Head Office"}</td>
                              <td className="py-3 px-4 text-caption text-text-muted">
                                {new Date(adv.receivedDate).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-ink text-caption">{adv.method}</span>
                                {adv.projectRef && (
                                  <span className="text-[11px] text-text-muted font-mono block mt-0.5">
                                    Ref: {adv.projectRef}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                                ৳{adv.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-text-muted">
                                ৳{(adv.adjustedAmount ?? 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-success">
                                ৳{remaining.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                    adv.status === "REFUNDED"
                                      ? "bg-danger-tint text-danger border-danger/20"
                                      : adv.status === "PARTIALLY_ADJUSTED"
                                      ? "bg-primary-tint text-primary border-primary/20"
                                      : adv.status === "FULLY_ADJUSTED"
                                      ? "bg-success-tint text-success border-success/20"
                                      : "bg-warning-tint text-warning border-warning/20"
                                  }`}
                                >
                                  {adv.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {remaining > 0 ? (
                                  <button
                                    onClick={() => {
                                      setSelectedAdvanceForAdjust(adv);
                                      setAdjustAdvanceModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-caption font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover inline-flex items-center gap-1 transition-colors shadow-sm"
                                    title="Adjust this advance against a commercial invoice"
                                  >
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                    <span>Adjust</span>
                                  </button>
                                ) : (
                                  <span className="text-caption text-text-muted italic">Fully settled</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 6: PAYMENTS & COLLECTIONS TABLE */}
            {activeTab === "payments" && (
              <>
                {payments.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <CreditCard className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Payments / Collections Found</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      No customer collections recorded yet. Record invoice payments received via Cash, Cheque, Bank Transfer, or bKash / Nagad.
                    </p>
                    <button
                      onClick={() => {
                        setDefaultInvoiceForPayment(undefined);
                        setRecordPaymentModalOpen(true);
                      }}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Payment / Collection</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Receipt #</th>
                          <th className="py-3 px-4">Commercial Bill #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Payment Date</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4">Transaction Ref</th>
                          <th className="py-3 px-4">Bank Proof (Rule §25)</th>
                          <th className="py-3 px-4 text-right">Amount Received (৳)</th>
                          <th className="py-3 px-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-page-bg/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-ink">#RCP-{p.id.slice(-6).toUpperCase()}</span>
                            </td>
                            <td className="py-3 px-4">
                              {p.invoice ? (
                                <span className="font-mono text-primary font-semibold">
                                  {p.invoice.invoiceNumber}
                                </span>
                              ) : (
                                <span className="text-text-muted font-mono">{p.invoiceId}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-ink leading-tight">
                                {p.invoice?.customer?.displayName || "Customer"}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-caption text-text-muted">
                              {new Date(p.receivedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-ink text-caption px-2 py-0.5 rounded bg-page-bg border border-border">
                                {p.method}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-caption text-text-muted">
                              {p.gatewayTransactionId || "—"}
                            </td>
                            <td className="py-3 px-4 text-caption">
                              <span className="text-text-muted font-mono text-[11px]">Recorded</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-success">
                              ৳{p.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-caption text-text-muted max-w-xs truncate">
                              Settled against {p.invoice?.invoiceNumber || "Bill"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 7: CREDIT NOTES TABLE */}
            {activeTab === "credit-notes" && (
              <>
                {creditNotes.length === 0 ? (
                  <div className="p-16 text-center space-y-3">
                    <FileMinus className="w-12 h-12 mx-auto text-text-muted/40" />
                    <h3 className="text-h3 font-bold text-ink">No Credit Notes Issued</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto">
                      Credit notes issued for customer returns, billing adjustments, or special rate discounts will be recorded here.
                    </p>
                    <button
                      onClick={() => {
                        setDefaultInvoiceForCreditNote(undefined);
                        setCreateCreditNoteModalOpen(true);
                      }}
                      className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Issue Credit Note</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body">
                      <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Credit Note #</th>
                          <th className="py-3 px-4">Commercial Bill #</th>
                          <th className="py-3 px-4">Customer Account</th>
                          <th className="py-3 px-4">Issue Date</th>
                          <th className="py-3 px-4">Adjustment Reason</th>
                          <th className="py-3 px-4 text-right">Credit Amount (৳)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {creditNotes.map((cn) => (
                          <tr key={cn.id} className="hover:bg-page-bg/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-ink">{cn.creditNoteNumber}</span>
                            </td>
                            <td className="py-3 px-4">
                              {cn.invoice ? (
                                <span className="font-mono text-primary font-semibold">
                                  {cn.invoice.invoiceNumber}
                                </span>
                              ) : (
                                <span className="font-mono text-text-muted">{cn.invoiceId}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-ink leading-tight">
                                {cn.invoice?.customer?.displayName || "Customer"}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-caption text-text-muted">
                              {new Date(cn.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-caption text-ink max-w-sm">
                              {cn.reason}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-danger">
                              ৳{cn.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[11px] font-semibold text-danger px-2 py-0.5 rounded-full bg-danger-tint border border-danger/20">
                                ISSUED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB 8: RETURNS (Invoice Sales Returns & Challan Returns) */}
            {activeTab === "returns" && (
              <div className="p-4 space-y-4">
                {/* Subtabs Switcher */}
                <div className="flex items-center gap-2 p-1 bg-page-bg rounded-md border border-border w-fit">
                  <button
                    onClick={() => {
                      setReturnsSubTab("sales_returns");
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-caption font-semibold rounded transition-colors flex items-center gap-1.5 ${
                      returnsSubTab === "sales_returns"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-text-muted hover:text-ink"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-warning" />
                    <span>Invoice Sales Returns ({salesReturnsTotal})</span>
                  </button>
                  <button
                    onClick={() => {
                      setReturnsSubTab("challan_returns");
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-caption font-semibold rounded transition-colors flex items-center gap-1.5 ${
                      returnsSubTab === "challan_returns"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-text-muted hover:text-ink"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-purple" />
                    <span>Challan Physical Returns ({challanReturnsTotal})</span>
                  </button>
                </div>

                {/* Subtab 1: Invoice Sales Returns */}
                {returnsSubTab === "sales_returns" && (
                  <>
                    {salesReturns.length === 0 ? (
                      <div className="p-16 text-center space-y-3">
                        <RotateCcw className="w-12 h-12 mx-auto text-text-muted/40" />
                        <h3 className="text-h3 font-bold text-ink">No Sales Returns Recorded</h3>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                          Customer product returns against invoices restock inventory in real-time and credit refunds to the customer&apos;s wallet.
                        </p>
                        <p className="text-caption text-text-muted">
                          You can initiate a Sales Return directly from any invoice row in the <strong>Invoices &amp; Billing</strong> tab.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-md bg-surface">
                        <table className="w-full text-left text-body">
                          <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                            <tr>
                              <th className="py-3 px-4">Return #</th>
                              <th className="py-3 px-4">Invoice #</th>
                              <th className="py-3 px-4">Customer Account</th>
                              <th className="py-3 px-4">Restocked Warehouse</th>
                              <th className="py-3 px-4">Return Date</th>
                              <th className="py-3 px-4">Returned Items &amp; Serials</th>
                              <th className="py-3 px-4 text-right">Refund / Wallet (৳)</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {salesReturns.map((sr) => (
                              <tr key={sr.id} className="hover:bg-page-bg/40 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-ink">{sr.returnNumber}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-semibold text-primary">
                                    {sr.invoice?.invoiceNumber || sr.invoiceId}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-ink leading-tight">
                                    {sr.customer?.displayName || "Customer"}
                                  </p>
                                  <span className="text-[11px] text-text-muted font-mono">
                                    {sr.customer?.customerCode}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-body text-ink">
                                  {sr.warehouse?.name || "Main Warehouse"}
                                </td>
                                <td className="py-3 px-4 text-caption text-text-muted">
                                  {new Date(sr.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    {sr.lines?.map((line) => (
                                      <div key={line.id} className="text-caption flex flex-wrap items-center gap-1.5">
                                        <span className="font-semibold text-ink">{line.quantity}x</span>
                                        <span className="text-ink">{line.product?.name || "Item"}</span>
                                        {line.serials && line.serials.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {line.serials.map((s) => (
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
                                <td className="py-3 px-4 text-right">
                                  <p className="font-mono font-bold text-ink">
                                    ৳{sr.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                                  </p>
                                  {sr.refundAmount > 0 ? (
                                    <span className="text-[10px] font-medium text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                                      <Wallet className="w-3 h-3" />
                                      <span>Wallet: ৳{sr.refundAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-amber-600 flex items-center justify-end gap-1 mt-0.5">
                                      <span>Due Adjusted</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-[11px] font-semibold text-success px-2 py-0.5 rounded-full bg-success-tint border border-success/20">
                                    {sr.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Subtab 2: Challan Physical Returns */}
                {returnsSubTab === "challan_returns" && (
                  <>
                    {challanReturns.length === 0 ? (
                      <div className="p-16 text-center space-y-3">
                        <Undo2 className="w-12 h-12 mx-auto text-text-muted/40" />
                        <h3 className="text-h3 font-bold text-ink">No Challan Returns Recorded</h3>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                          When delivered equipment is rejected at site or returned for repair/replacement, record the Challan Return here.
                        </p>
                        <button
                          onClick={() => {
                            setDefaultChallanForReturn(null);
                            setCreateChallanReturnModalOpen(true);
                          }}
                          className="px-4 py-2 mt-2 rounded-sm bg-primary text-white text-body font-medium hover:bg-primary-hover shadow-sm inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Record Challan Return</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-md bg-surface">
                        <table className="w-full text-left text-body">
                          <thead className="bg-page-bg/70 text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
                            <tr>
                              <th className="py-3 px-4">Return #</th>
                              <th className="py-3 px-4">Origin Challan #</th>
                              <th className="py-3 px-4">Customer Account</th>
                              <th className="py-3 px-4">Return Date</th>
                              <th className="py-3 px-4">Returned Items &amp; Conditions</th>
                              <th className="py-3 px-4 text-center">Damage Report</th>
                              <th className="py-3 px-4">Reason / Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {challanReturns.map((cr) => (
                              <tr key={cr.id} className="hover:bg-page-bg/40 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-ink">{cr.returnNumber}</span>
                                </td>
                                <td className="py-3 px-4">
                                  {cr.challan ? (
                                    <span className="font-mono text-purple font-semibold">
                                      {cr.challan.challanNumber}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-text-muted">{cr.challanId}</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-ink leading-tight">
                                    {cr.challan?.salesOrder?.customer?.displayName || "Customer"}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-caption text-text-muted">
                                  {new Date(cr.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    {cr.lines?.map((line) => (
                                      <div key={line.id} className="text-caption flex items-center gap-1.5">
                                        <span className="font-semibold text-ink">{line.quantity}x</span>
                                        <span
                                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                            line.condition === "GOOD"
                                              ? "bg-success-tint text-success border-success/20"
                                              : "bg-danger-tint text-danger border-danger/20"
                                          }`}
                                        >
                                          {line.condition}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {cr.lines?.some((l) => l.damageLossReportId) ? (
                                    <span className="text-[11px] font-semibold text-danger px-2 py-0.5 rounded-full bg-danger-tint border border-danger/20">
                                      Auto-Reported
                                    </span>
                                  ) : (
                                    <span className="text-caption text-text-muted">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-caption text-text-muted max-w-xs truncate">
                                  {cr.lines?.map((l) => `${l.quantity}x ${l.condition}`).join(", ") || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                    <strong>{Math.min(page * pageSize, totalCount)}</strong> of{" "}
                    <strong>{totalCount}</strong> records
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-caption text-text-muted">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 rounded border border-border bg-surface text-ink text-caption outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-border bg-surface text-ink hover:bg-page-bg disabled:opacity-40 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <span className="px-2 font-medium text-ink">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-border bg-surface text-ink hover:bg-page-bg disabled:opacity-40 flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals & Drawers */}
      <CreateQuotationModal
        isOpen={createQuoteModalOpen}
        onClose={() => setCreateQuoteModalOpen(false)}
        onSuccess={handleQuotationCreated}
        branches={branches}
        customers={customers}
        products={products}
        defaultBranchId={branchFilter}
      />

      <QuotationDetailDrawer
        quotation={selectedQuote}
        isOpen={quoteDrawerOpen}
        onClose={() => {
          setQuoteDrawerOpen(false);
          setSelectedQuote(null);
        }}
        onUpdate={handleQuotationUpdated}
        onConverted={handleQuotationConverted}
      />

      <CreateSalesOrderModal
        isOpen={createOrderModalOpen}
        onClose={() => setCreateOrderModalOpen(false)}
        onSuccess={handleOrderCreated}
        branches={branches}
        customers={customers}
        products={products}
        defaultBranchId={branchFilter}
      />

      <SalesOrderDetailDrawer
        order={selectedOrder}
        isOpen={orderDrawerOpen}
        onClose={() => {
          setOrderDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onChallanDispatched={handleChallanDispatched}
        onCreateInvoice={(ord) => {
          setPreSelectedOrderForInvoice(ord.id);
          setCreateInvoiceModalOpen(true);
        }}
        products={products}
      />

      <CreateInvoiceModal
        isOpen={createInvoiceModalOpen}
        onClose={() => {
          setCreateInvoiceModalOpen(false);
          setPreSelectedOrderForInvoice(undefined);
        }}
        onSuccess={handleInvoiceCreated}
        orders={orders}
        preSelectedOrderId={preSelectedOrderForInvoice}
      />

      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        isOpen={invoiceDrawerOpen}
        onClose={() => {
          setInvoiceDrawerOpen(false);
          setSelectedInvoice(null);
        }}
      />

      {/* Long-Term Project Creation Modal */}
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onSuccess={handleProjectCreated}
        branches={branches}
        customers={customers}
        products={products}
        defaultBranchId={branchFilter}
      />

      {/* Project Detail Drawer (Scope, Continuous Site Challans & Consolidated Invoicing) */}
      <ProjectDetailDrawer
        project={selectedProject}
        isOpen={projectDrawerOpen}
        onClose={() => {
          setProjectDrawerOpen(false);
          setSelectedProject(null);
        }}
        onProjectUpdated={fetchData}
        products={products}
        onViewInvoice={(inv) => {
          setSelectedInvoice(inv);
          setInvoiceDrawerOpen(true);
        }}
      />

      {/* Direct Counter Sale Modal (Instant Billing & Stock Deduction) */}
      <DirectSaleModal
        isOpen={directSaleModalOpen}
        onClose={() => setDirectSaleModalOpen(false)}
        onSuccess={handleDirectSaleSuccess}
        branches={branches}
        customers={customers}
        products={products}
        defaultBranchId={branchFilter}
        onViewInvoice={(inv) => {
          setSelectedInvoice(inv);
          setInvoiceDrawerOpen(true);
        }}
      />

      {/* Customer Advance Modal */}
      <CreateCustomerAdvanceModal
        isOpen={createAdvanceModalOpen}
        onClose={() => setCreateAdvanceModalOpen(false)}
        onSuccess={(adv) => {
          addToast("success", `Customer Advance #${adv.id.slice(-6).toUpperCase()} recorded.`);
          fetchData();
        }}
        branches={branches}
        customers={customers}
        defaultBranchId={branchFilter}
      />

      {/* Adjust Advance Modal */}
      <AdjustAdvanceModal
        isOpen={adjustAdvanceModalOpen}
        onClose={() => {
          setAdjustAdvanceModalOpen(false);
          setSelectedAdvanceForAdjust(null);
        }}
        onSuccess={() => {
          addToast("success", "Customer advance adjusted against invoice successfully.");
          fetchData();
        }}
        advance={selectedAdvanceForAdjust}
        invoices={invoices}
      />

      {/* Record Payment / Collection Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => {
          setRecordPaymentModalOpen(false);
          setDefaultInvoiceForPayment(undefined);
        }}
        onSuccess={(p) => {
          addToast("success", `Payment / Receipt #${p.id.slice(-6).toUpperCase()} recorded successfully.`);
          fetchData();
        }}
        invoices={invoices}
        defaultInvoiceId={defaultInvoiceForPayment}
      />

      {/* Credit Note Modal */}
      <CreateCreditNoteModal
        isOpen={createCreditNoteModalOpen}
        onClose={() => {
          setCreateCreditNoteModalOpen(false);
          setDefaultInvoiceForCreditNote(undefined);
        }}
        onSuccess={(cn) => {
          addToast("success", `Credit Note ${cn.creditNoteNumber} issued.`);
          fetchData();
        }}
        invoices={invoices}
        defaultInvoiceId={defaultInvoiceForCreditNote}
      />

      {/* Delivery Challan Return Modal */}
      <CreateChallanReturnModal
        isOpen={createChallanReturnModalOpen}
        onClose={() => {
          setCreateChallanReturnModalOpen(false);
          setDefaultChallanForReturn(null);
        }}
        onSuccess={(cr) => {
          addToast("success", `Challan Return ${cr.returnNumber} recorded.`);
          fetchData();
        }}
        challans={challans}
        defaultChallanId={defaultChallanForReturn?.id}
      />

      {/* Invoice Sales Return Modal */}
      <CreateSalesReturnModal
        invoice={selectedInvoiceForReturn}
        isOpen={createSalesReturnModalOpen}
        onClose={() => {
          setCreateSalesReturnModalOpen(false);
          setSelectedInvoiceForReturn(null);
        }}
        onSuccess={() => {
          addToast("success", "Sales return processed successfully! Products restocked and customer wallet credited.");
          fetchData();
        }}
      />

      {/* Sales Order Fulfillment Modal */}
      <OrderFulfillmentModal
        isOpen={fulfillmentModalOpen}
        onClose={() => setFulfillmentModalOpen(false)}
        salesOrderId={fulfillmentOrderId}
        orderNumber={fulfillmentOrderNumber}
      />
    </div>
  );
};
