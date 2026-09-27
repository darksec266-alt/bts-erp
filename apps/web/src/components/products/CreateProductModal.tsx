"use client";

import React, { useState, useEffect } from "react";
import { Package, Check, AlertCircle, Loader2 } from "lucide-react";
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
        trackingType,
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                SKU / Item Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none uppercase"
                placeholder="e.g. CAM-DOME-2MP"
                required
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Item Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g. 2MP Dome HD Camera"
                required
              />
            </div>
          </div>

          {/* Inventory Tracking Type */}
          <div className="p-3 bg-page-bg/60 rounded-md border border-border space-y-2">
            <label className="block text-caption font-semibold text-ink">
              Inventory Tracking Type <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-sm border cursor-pointer transition-colors ${
                  trackingType === "NON_SERIALIZED"
                    ? "border-primary bg-primary-tint/30 text-ink"
                    : "border-border bg-surface text-text-muted hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="trackingType"
                  value="NON_SERIALIZED"
                  checked={trackingType === "NON_SERIALIZED"}
                  onChange={() => setTrackingType("NON_SERIALIZED")}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="text-body font-semibold text-ink">Non-Serialized / Bulk Product</div>
                  <div className="text-caption text-text-muted">
                    Tracked by quantity only (e.g. BNC Connectors, RJ45, DC Pins, Cables, Adapters).
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-sm border cursor-pointer transition-colors ${
                  trackingType === "SERIALIZED"
                    ? "border-primary bg-primary-tint/30 text-ink"
                    : "border-border bg-surface text-text-muted hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="trackingType"
                  value="SERIALIZED"
                  checked={trackingType === "SERIALIZED"}
                  onChange={() => setTrackingType("SERIALIZED")}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="text-body font-semibold text-ink">Serialized Unit Product</div>
                  <div className="text-caption text-text-muted">
                    Tracked by unique serial & barcode per physical unit (e.g. CCTV Cameras, NVR, DVR, Hard Disks).
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Model Number {trackingType === "SERIALIZED" && <span className="text-primary text-xs">(Recommended)</span>}
              </label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g. DS-2CD2043G2-I"
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Product Model Barcode / EAN
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g. 6941264019283"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  setCategoryId(newCatId);
                  setSubCategoryId("");
                }}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">(No Category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Sub-Category
              </label>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                disabled={!categoryId}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {categoryId
                    ? availableSubCategories.length > 0
                      ? "(Select Sub-Category)"
                      : "(No Sub-Categories for this Category)"
                    : "(Select Category First)"}
                </option>
                {availableSubCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">(No Brand)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Unit of Measure
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              >
                <option value="">(Default: PCS)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

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
