"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Percent,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  ProductDto,
  CategoryDto,
  SubCategoryDto,
  BrandDto,
  UnitDto,
} from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: ProductDto) => void;
  categories: CategoryDto[];
  subCategories?: SubCategoryDto[];
  brands: BrandDto[];
  units: UnitDto[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  subCategories = [],
  brands,
  units,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [isServiceItem, setIsServiceItem] = useState(false);
  const [trackingType, setTrackingType] = useState<"SERIALIZED" | "NON_SERIALIZED">("NON_SERIALIZED");
  const [modelNumber, setModelNumber] = useState("");
  const [barcode, setBarcode] = useState("");

  // Authorized Enhancements: Inventory & Sales Controls (Section 12)
  const [trackStock, setTrackStock] = useState(true);
  const [allowSale, setAllowSale] = useState(true);
  const [allowPurchase, setAllowPurchase] = useState(true);
  const [allowDiscount, setAllowDiscount] = useState(true);

  // Authorized Enhancements: Warranty Configuration (Section 13)
  const [enableWarranty, setEnableWarranty] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [warrantyType, setWarrantyType] = useState<"MANUFACTURER" | "SELLER" | "SERVICE" | "EXTENDED">("MANUFACTURER");
  const [warrantyCoverage, setWarrantyCoverage] = useState("Full parts & labor coverage");
  const [warrantyTerms, setWarrantyTerms] = useState("Active from date of customer invoice. Excludes physical/water damage.");

  // Authorized Enhancements: VAT Configuration (Section 19)
  const [vatApplicable, setVatApplicable] = useState(true);
  const [vatRatePercent, setVatRatePercent] = useState("15");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setSku(`SKU-2026-${randomSuffix}`);
      setName("");
      setCategoryId(categories[0]?.id || "");
      setSubCategoryId("");
      setBrandId(brands[0]?.id || "");
      setUnitId(units[0]?.id || "");
      setCostPrice("0");
      setSellingPrice("0");
      setIsServiceItem(false);
      setTrackingType("NON_SERIALIZED");
      setModelNumber("");
      setBarcode("");
      setTrackStock(true);
      setAllowSale(true);
      setAllowPurchase(true);
      setAllowDiscount(true);
      setEnableWarranty(false);
      setWarrantyMonths("12");
      setWarrantyType("MANUFACTURER");
      setVatApplicable(true);
      setVatRatePercent("15");
      setError(null);
    }
  }, [isOpen, categories, brands, units]);

  const availableSubCategories = subCategories.filter(
    (sc) => sc.categoryId === categoryId && sc.isActive
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setError("SKU and Product Name are required.");
      return;
    }

    if (isNaN(Number(costPrice)) || isNaN(Number(sellingPrice))) {
      setError("Cost price and selling price must be valid numeric values.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await api.createProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        categoryId: categoryId || undefined,
        subCategoryId: subCategoryId || undefined,
        brandId: brandId || undefined,
        unitId: unitId || undefined,
        costPrice: String(costPrice),
        sellingPrice: String(sellingPrice),
        isServiceItem,
        trackingType: isServiceItem ? "NON_SERIALIZED" : trackingType,
        modelNumber: modelNumber.trim() || undefined,
        barcode: barcode.trim() || undefined,
      });
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="New Product Master"
        icon={Package}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface shadow-elevation-2 border border-border flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "w-full max-w-xl rounded-md max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-primary-tint flex items-center justify-center text-primary">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-h3 text-ink font-bold">New Product Master</h3>
              <p className="text-caption text-text-muted">
                Register a new inventory or service SKU in the catalog.
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-body bg-danger-tint text-danger rounded-sm border border-danger/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Item SKU <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="SKU-2026-XXXX"
                required
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Barcode / EAN
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="Scan or enter barcode"
              />
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-caption font-semibold text-ink mb-1">
              Product Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
              placeholder="e.g. Cisco Catalyst 2960 Switch 24-Port"
              required
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubCategoryId("");
                }}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Subcategory</label>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                disabled={!categoryId || availableSubCategories.length === 0}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Select Subcategory</option>
                {availableSubCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand, Unit & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Brand</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Unit of Measure</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">Model / Spec</label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g. WS-C2960-24TT-L"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Standard Cost Price (৳ BDT) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Selling Price (৳ BDT) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                required
              />
            </div>
          </div>

          {/* Service Item Toggle */}
          <div className="p-3 rounded-sm bg-page-bg border border-border flex items-center justify-between">
            <div>
              <p className="text-body font-semibold text-ink">Service Item (No Physical Stock)</p>
              <p className="text-caption text-text-muted">
                Check if this item represents labor, installation, or software service rather than physical warehouse goods.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isServiceItem}
                onChange={(e) => setIsServiceItem(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Advanced Warranty & VAT Options Toggle */}
          <div className="border border-border rounded-sm overflow-hidden bg-surface">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[13px] font-medium text-ink bg-page-bg/30 hover:bg-page-bg/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Warranty, VAT & Operational Controls (Optional)
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-border bg-surface">
                {/* Tracking & Inventory Controls */}
                {!isServiceItem && (
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold text-ink uppercase tracking-wider">
                      Inventory & Lifecycle Controls
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                        <input
                          type="checkbox"
                          checked={trackingType === "SERIALIZED"}
                          onChange={(e) => setTrackingType(e.target.checked ? "SERIALIZED" : "NON_SERIALIZED")}
                          className="rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-ink">Serialized (Track Unit Serials)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                        <input
                          type="checkbox"
                          checked={trackStock}
                          onChange={(e) => setTrackStock(e.target.checked)}
                          className="rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-ink">Track Stock Balance</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                        <input
                          type="checkbox"
                          checked={allowSale}
                          onChange={(e) => setAllowSale(e.target.checked)}
                          className="rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-ink">Allow for Sale</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-sm border border-border/50 hover:bg-page-bg/50">
                        <input
                          type="checkbox"
                          checked={allowDiscount}
                          onChange={(e) => setAllowDiscount(e.target.checked)}
                          className="rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-ink">Allow Discounts</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Warranty Configuration (Section 13) */}
                <div className="p-3 rounded-sm border border-border/70 bg-page-bg/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-ink block">Warranty Configuration</span>
                      <span className="text-[11px] text-text-muted block">
                        Enable warranty coverage and claim eligibility for sold units.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableWarranty}
                        onChange={(e) => setEnableWarranty(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {enableWarranty && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-text-muted mb-1">
                            Warranty Period (Months)
                          </label>
                          <select
                            value={warrantyMonths}
                            onChange={(e) => setWarrantyMonths(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none cursor-pointer"
                          >
                            <option value="6">6 Months</option>
                            <option value="12">12 Months (1 Year)</option>
                            <option value="24">24 Months (2 Years)</option>
                            <option value="36">36 Months (3 Years)</option>
                            <option value="60">60 Months (5 Years)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-text-muted mb-1">
                            Warranty Type
                          </label>
                          <select
                            value={warrantyType}
                            onChange={(e) => setWarrantyType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none cursor-pointer"
                          >
                            <option value="MANUFACTURER">Manufacturer Warranty</option>
                            <option value="SELLER">Seller Warranty</option>
                            <option value="SERVICE">Service & Labor Only</option>
                            <option value="EXTENDED">Extended Warranty</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          Coverage Scope
                        </label>
                        <input
                          type="text"
                          value={warrantyCoverage}
                          onChange={(e) => setWarrantyCoverage(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none"
                          placeholder="e.g. Free parts replacement & bench repair"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* VAT Configuration (Section 19) */}
                <div className="p-3 rounded-sm border border-border/70 bg-page-bg/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-ink block">VAT / Tax Treatment</span>
                      <span className="text-[11px] text-text-muted block">
                        NBR standard VAT rate applicable to this SKU.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vatApplicable}
                        onChange={(e) => setVatApplicable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {vatApplicable && (
                    <div className="pt-2 border-t border-border flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-text-muted mb-1">
                          Standard VAT Rate (%)
                        </label>
                        <select
                          value={vatRatePercent}
                          onChange={(e) => setVatRatePercent(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-surface text-ink outline-none cursor-pointer"
                        >
                          <option value="0">0% (Exempt)</option>
                          <option value="5">5% (Truncated Rate)</option>
                          <option value="7.5">7.5% (Intermediate Rate)</option>
                          <option value="10">10% (Reduced Rate)</option>
                          <option value="15">15% (Standard NBR Rate)</option>
                        </select>
                      </div>
                      <div className="text-[11px] text-text-muted pt-4">
                        Invoices retain transaction-specific VAT treatment.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body font-medium rounded-sm border border-border text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
