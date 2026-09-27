"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Printer,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  Warehouse,
  Barcode,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  BranchDto,
  CustomerDto,
  ProductDto,
  WarehouseDto,
  DirectSaleResultDto,
  InvoiceDto,
} from "@bts/shared-types";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { CustomerSearchSelect } from "../common/CustomerSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: DirectSaleResultDto) => void;
  branches: BranchDto[];
  customers: CustomerDto[];
  products: ProductDto[];
  defaultBranchId?: string;
  onViewInvoice?: (invoice: InvoiceDto) => void;
}

interface DirectSaleLineInput {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  availableStock?: number;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED";
  serials?: string[];
}

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  customers,
  products,
  defaultBranchId,
  onViewInvoice,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [productList, setProductList] = useState<ProductDto[]>(products);
  const [customerList, setCustomerList] = useState<CustomerDto[]>(customers);

  // Sync props
  useEffect(() => {
    if (products && products.length > 0) {
      setProductList(products);
    }
  }, [products]);

  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerList(customers);
    }
  }, [customers]);

  // Always fetch fresh products, stock and customers when modal is opened
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.getProducts({ take: 300 }),
      api.getCustomers({ take: 300 }),
    ])
      .then(([pRes, cRes]) => {
        if (pRes.items && pRes.items.length > 0) {
          setProductList(pRes.items);
        }
        if (cRes.items && cRes.items.length > 0) {
          setCustomerList(cRes.items);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  const getProductStock = (prodId: string, whId: string): number => {
    const prod = productList.find((p) => p.id === prodId);
    if (!prod) return 0;
    if (whId && prod.stockLedgers && prod.stockLedgers.length > 0) {
      const match = prod.stockLedgers.find((sl) => sl.warehouseId === whId);
      if (match) return Number(match.quantityOnHand) || 0;
    }
    return Number(prod.totalStock) || 0;
  };

  const [lines, setLines] = useState<DirectSaleLineInput[]>([
    {
      productId: products[0]?.id || "",
      description: products[0]?.name || "",
      quantity: 1,
      unitPrice: Number(products[0]?.sellingPrice) || 0,
      availableStock: products[0]?.totalStock ?? 0,
    },
  ]);

  // Recalculate available stock when warehouse or productList changes
  useEffect(() => {
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        availableStock: getProductStock(line.productId, warehouseId),
      }))
    );
  }, [warehouseId, productList]);

  const discountAmount = 0;
  const taxAmount = 0;

  // Payment
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<DirectSaleResultDto | null>(null);

  // Barcode / Serial scanning state
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const res = await api.getWarehouses({ isActive: true, take: 50 });
        setWarehouses(res.items || []);
        if (res.items && res.items.length > 0 && !warehouseId) {
          setWarehouseId(res.items[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch warehouses:", err);
      }
    };
    loadWarehouses();
  }, [warehouseId]);

  useEffect(() => {
    if (defaultBranchId) {
      setBranchId(defaultBranchId);
    } else if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, defaultBranchId, branchId]);

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Direct Sale (Instant Invoicing)"
        icon={<Zap className="w-4 h-4 text-amber-500" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  // POS Barcode Scanner Handler
  const handleScanBarcode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    try {
      setScanLoading(true);
      setError(null);
      setScanSuccessMessage(null);

      const result = await api.scanBarcode({
        barcode: raw,
        warehouseId: warehouseId || undefined,
      });

      if (!result.found || !result.product) {
        setError(`No product or serial unit found matching "${raw}".`);
        return;
      }

      const prod = result.product;
      const isSerialized = result.trackingType === "SERIALIZED" || prod.trackingType === "SERIALIZED";

      if (isSerialized) {
        if (!result.serialNumber) {
          setError(`"${prod.name}" is a serialized item. Please scan the unit barcode or serial number on the unit label.`);
          return;
        }

        const sn = result.serialNumber;
        if (sn.currentStage !== "IN_STOCK") {
          setError(`Serial unit "${sn.serial}" is currently ${sn.currentStage} and cannot be sold.`);
          return;
        }

        if (warehouseId && sn.warehouseId && sn.warehouseId !== warehouseId) {
          setError(`Serial unit "${sn.serial}" is in a different warehouse (${sn.warehouse?.name || sn.warehouseId}).`);
          return;
        }

        // Check if already in sale cart
        const alreadyScanned = lines.some((l) => l.serials?.includes(sn.serial));
        if (alreadyScanned) {
          setError(`Serial unit "${sn.serial}" is already added to this direct sale.`);
          return;
        }

        setLines((prev) => {
          const nonPlaceholders = prev.filter((l) => l.productId);
          const existingLineIdx = nonPlaceholders.findIndex((l) => l.productId === prod.id);

          if (existingLineIdx >= 0) {
            const updated = [...nonPlaceholders];
            const cur = updated[existingLineIdx];
            const newSerials = [...(cur.serials || []), sn.serial];
            updated[existingLineIdx] = {
              ...cur,
              serials: newSerials,
              quantity: newSerials.length,
              trackingType: "SERIALIZED",
            };
            return updated;
          } else {
            return [
              ...nonPlaceholders,
              {
                productId: prod.id,
                description: prod.name,
                quantity: 1,
                unitPrice: Number(prod.sellingPrice) || 0,
                availableStock: getProductStock(prod.id, warehouseId),
                trackingType: "SERIALIZED",
                serials: [sn.serial],
              },
            ];
          }
        });

        setScanSuccessMessage(`Scanned serialized unit: ${prod.name} (SN: ${sn.serial})`);
      } else {
        // Non-serialized bulk item scanned
        setLines((prev) => {
          const nonPlaceholders = prev.filter((l) => l.productId);
          const existingLineIdx = nonPlaceholders.findIndex((l) => l.productId === prod.id);

          if (existingLineIdx >= 0) {
            const updated = [...nonPlaceholders];
            const cur = updated[existingLineIdx];
            updated[existingLineIdx] = {
              ...cur,
              quantity: Number(cur.quantity || 0) + 1,
              trackingType: "NON_SERIALIZED",
            };
            return updated;
          } else {
            return [
              ...nonPlaceholders,
              {
                productId: prod.id,
                description: prod.name,
                quantity: 1,
                unitPrice: Number(prod.sellingPrice) || 0,
                availableStock: getProductStock(prod.id, warehouseId),
                trackingType: "NON_SERIALIZED",
              },
            ];
          }
        });

        setScanSuccessMessage(`Scanned bulk item: ${prod.name} (+1 qty)`);
      }

      setBarcodeInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to scan barcode.");
    } finally {
      setScanLoading(false);
    }
  };

  const handleRemoveLineSerial = (lineIndex: number, serialToRemove: string) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = updated[lineIndex];
      const newSerials = (cur.serials || []).filter((s) => s !== serialToRemove);
      updated[lineIndex] = {
        ...cur,
        serials: newSerials,
        quantity: Math.max(1, newSerials.length),
      };
      return updated;
    });
  };

  const handleAddLine = () => {
    const firstProd = productList[0] || products[0];
    const tracking = firstProd?.trackingType || "NON_SERIALIZED";
    setLines((prev) => [
      ...prev,
      {
        productId: firstProd?.id || "",
        description: firstProd?.name || "",
        quantity: 1,
        unitPrice: Number(firstProd?.sellingPrice) || 0,
        availableStock: getProductStock(firstProd?.id || "", warehouseId),
        trackingType: tracking,
        serials: [],
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, selectedProductId: string) => {
    const prod = productList.find((p) => p.id === selectedProductId) || products.find((p) => p.id === selectedProductId);
    const tracking = prod?.trackingType || "NON_SERIALIZED";
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          productId: selectedProductId,
          description: prod?.name || "",
          unitPrice: prod ? Number(prod.sellingPrice) || 0 : line.unitPrice,
          availableStock: getProductStock(selectedProductId, warehouseId),
          trackingType: tracking,
          serials: [],
        };
      })
    );
  };

  const handleLineChange = (
    index: number,
    field: "quantity" | "unitPrice",
    value: number
  ) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCustomerId = customerId || customers[0]?.id;
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!effectiveCustomerId) {
      setError("Please select a customer account.");
      return;
    }
    if (!effectiveBranchId) {
      setError("Please select an operating branch.");
      return;
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0)) {
      setError("All line items must have a product and quantity greater than zero.");
      return;
    }

    // Validate serialized lines
    for (const l of lines) {
      if (l.trackingType === "SERIALIZED" && l.serials && l.serials.length > 0) {
        if (l.serials.length !== l.quantity) {
          setError(`Product "${l.description}" has ${l.serials.length} serial numbers for ${l.quantity} units.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await api.createDirectSale({
        customerId: effectiveCustomerId,
        branchId: effectiveBranchId,
        warehouseId: warehouseId || undefined,
        notes: notes.trim() || undefined,
        isPaid,
        paymentMethod: isPaid ? paymentMethod : undefined,
        lines: lines
          .filter((l) => l.productId && l.quantity > 0)
          .map((l) => ({
            productId: l.productId,
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            serials: l.serials && l.serials.length > 0 ? l.serials : undefined,
          })),
      });

      setCompletedResult(result);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute direct sale.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNewSale = () => {
    setCompletedResult(null);
    setLines([
      {
        productId: products[0]?.id || "",
        description: products[0]?.name || "",
        quantity: 1,
        unitPrice: Number(products[0]?.sellingPrice) || 0,
        availableStock: products[0]?.totalStock ?? 0,
      },
    ]);
    setError(null);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${isMaximized ? "p-0" : "p-4"}`}>
      <div className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0" : "relative w-full max-w-4xl rounded-md my-8"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Direct Sale (Instant Invoicing)</h2>
              <p className="text-caption text-text-muted">
                Spot counter sale with immediate invoice generation and automatic warehouse stock deduction.
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

        {/* Content: Completed State vs Form State */}
        {completedResult ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-success-tint text-success rounded-full flex items-center justify-center mx-auto shadow-elevation-1">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-h2 text-ink font-bold">Direct Sale Completed Successfully!</h3>
              <p className="text-body text-text-muted">
                Commercial Invoice <span className="font-mono font-bold text-primary">{completedResult.invoice.invoiceNumber}</span> has been issued and warehouse inventory deducted.
              </p>
            </div>

            {/* Quick Summary Card */}
            <div className="max-w-md mx-auto p-4 bg-page-bg/60 rounded-sm border border-border text-left space-y-2 text-body">
              <div className="flex justify-between">
                <span className="text-text-muted">Sales Order:</span>
                <span className="font-mono font-bold text-ink">{completedResult.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Invoice #:</span>
                <span className="font-mono font-bold text-primary">{completedResult.invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Grand Total:</span>
                <span className="font-mono font-bold text-ink">
                  BDT {completedResult.invoice.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Payment Status:</span>
                <span className="font-semibold text-success">
                  {completedResult.payment ? "PAID IN FULL (CASH/DIRECT)" : "PENDING"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  onViewInvoice?.(completedResult.invoice);
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-body font-semibold rounded-sm hover:opacity-95 shadow-elevation-1"
              >
                <Printer className="w-4 h-4" />
                View & Print Invoice
              </button>

              <button
                type="button"
                onClick={handleResetForNewSale}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-page-bg text-ink text-body font-semibold rounded-sm border border-border hover:bg-surface"
              >
                <Plus className="w-4 h-4" />
                New Direct Sale
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-text-muted hover:text-ink text-body font-medium"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Branch, Customer, and Warehouse */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-caption font-semibold text-ink mb-1.5">
                  Customer <span className="text-danger">*</span>
                </label>
                <CustomerSearchSelect
                  customers={customerList}
                  selectedCustomerId={customerId}
                  onSelect={(c) => setCustomerId(c?.id || "")}
                  required
                />
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink mb-1.5">
                  Operating Branch <span className="text-danger">*</span>
                </label>
                <select
                  value={branchId || defaultBranchId || (branches[0]?.id ?? "")}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                  required
                >
                  {branches.length === 0 && (
                    <option value="">(No branch available)</option>
                  )}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink mb-1.5 flex items-center gap-1">
                  <Warehouse className="w-3.5 h-3.5 text-text-muted" /> Deduct Stock From
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick POS Barcode Scanner Console */}
            <div className="p-3 bg-purple/5 border border-purple/20 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-ink flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-purple" />
                  <span>Scan Barcode or Serial (POS Fast Checkout)</span>
                </span>
                <span className="text-[11px] text-text-muted">
                  Supports CCTV cameras, NVRs & bulk accessories
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScanBarcode();
                      }
                    }}
                    placeholder="Scan product barcode or camera serial number (Press Enter)..."
                    className="w-full h-9 pl-9 pr-3 text-caption font-mono border border-border rounded-sm bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleScanBarcode()}
                  disabled={scanLoading || !barcodeInput.trim()}
                  className="h-9 px-4 bg-purple text-white rounded-sm text-caption font-semibold hover:bg-purple/90 flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
                  <span>Scan to Cart</span>
                </button>
              </div>
              {scanSuccessMessage && (
                <p className="text-[11px] font-semibold text-success flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{scanSuccessMessage}</span>
                </p>
              )}
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-amber-600" />
                  Cart / Direct Sale Items ({lines.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-semibold text-amber-700 bg-amber-500/10 rounded-sm hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              </div>

              <div className="border border-border rounded-sm overflow-hidden">
                <table className="w-full text-left text-body">
                  <thead className="bg-page-bg/80 border-b border-border text-caption font-semibold text-text-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 w-28 text-center">In Stock</th>
                      <th className="py-2.5 px-3 w-28">Quantity</th>
                      <th className="py-2.5 px-3 w-36">Unit Price (BDT)</th>
                      <th className="py-2.5 px-3 w-36 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line, index) => {
                      const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                      const isLowStock = line.availableStock !== undefined && line.availableStock < line.quantity;
                      return (
                        <tr key={index} className="hover:bg-page-bg/30">
                          <td className="p-2.5">
                            <ProductSearchSelect
                              products={productList}
                              selectedProductId={line.productId}
                              onSelect={(prod) => handleProductChange(index, prod ? prod.id : "")}
                              placeholder="Search product name or SKU..."
                              priceType="selling"
                              required
                            />
                            {line.trackingType === "SERIALIZED" && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple/10 text-purple border border-purple/30 rounded text-[10px] font-bold">
                                  <Barcode className="w-3 h-3" />
                                  SERIALIZED
                                </span>
                                {line.serials && line.serials.length > 0 && (
                                  <span className="text-[10px] text-text-muted font-medium">
                                    ({line.serials.length} units captured):
                                  </span>
                                )}
                                {line.serials?.map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface border border-purple/30 rounded text-[11px] font-mono text-ink shadow-2xs"
                                  >
                                    <span>{s}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLineSerial(index, s)}
                                      className="text-text-muted hover:text-danger rounded p-0.2"
                                      title={`Remove ${s}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <span
                              className={`text-caption font-semibold px-2 py-0.5 rounded-full ${
                                isLowStock
                                  ? "bg-danger-tint text-danger"
                                  : "bg-success-tint text-success"
                              }`}
                            >
                              {line.availableStock ?? 0}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              readOnly={line.trackingType === "SERIALIZED" && (line.serials?.length || 0) > 0}
                              onChange={(e) =>
                                handleLineChange(index, "quantity", Math.max(1, parseInt(e.target.value) || 0))
                              }
                              className={`w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none text-right font-mono ${
                                line.trackingType === "SERIALIZED" && (line.serials?.length || 0) > 0 ? "opacity-75 cursor-not-allowed" : ""
                              }`}
                              required
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) =>
                                handleLineChange(index, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none text-right font-mono"
                              required
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-medium text-ink">
                            {lineSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              disabled={lines.length <= 1}
                              className="p-1 rounded-sm text-text-muted hover:text-danger hover:bg-danger-tint disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Settlement Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-page-bg/40 rounded-sm border border-border">
              <div className="space-y-3">
                <span className="text-caption font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Instant Payment Settlement
                </span>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-body text-ink font-medium">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    Mark Paid in Full Now (Instant Cash/Bank Memo)
                  </label>
                </div>

                {isPaid && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-caption font-semibold text-text-muted mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="BKASH">bKash</option>
                        <option value="NAGAD">Nagad</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-caption font-semibold text-text-muted mb-1">
                        Remarks / Notes
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Counter invoice memo"
                        className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-body">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal:</span>
                  <span className="font-mono text-ink">
                    BDT {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Discount:</span>
                  <span className="font-mono text-ink">BDT 0.00</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>VAT / Tax (0%):</span>
                  <span className="font-mono text-ink">BDT 0.00</span>
                </div>
                <div className="flex justify-between text-h3 font-bold pt-2 border-t border-border">
                  <span className="text-ink">Grand Total:</span>
                  <span className="font-mono text-primary">
                    BDT {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-body font-medium text-text-muted hover:text-ink hover:bg-page-bg rounded-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 text-body font-semibold text-white bg-amber-600 rounded-sm hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-elevation-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                {loading ? "Processing Sale..." : "Complete Direct Sale & Issue Invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
