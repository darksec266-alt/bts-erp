"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Loader2,
  Trash2,
  Save,
  Tag,
  Layers,
  FolderTree,
  Scale,
  TrendingUp,
  Package,
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

interface ProductDetailDrawerProps {
  product: ProductDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: ProductDto) => void;
  onDelete: (id: string) => void;
  categories: CategoryDto[];
  subCategories?: SubCategoryDto[];
  brands: BrandDto[];
  units: UnitDto[];
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  categories,
  subCategories = [],
  brands,
  units,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [isServiceItem, setIsServiceItem] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.categoryId || "");
      setSubCategoryId(product.subCategoryId || "");
      setBrandId(product.brandId || "");
      setUnitId(product.unitId || "");
      setCostPrice(String(product.costPrice || "0"));
      setSellingPrice(String(product.sellingPrice || "0"));
      setIsServiceItem(Boolean(product.isServiceItem));
      setIsActive(Boolean(product.isActive));
      setError(null);
    }
  }, [product]);

  const availableSubCategories = subCategories.filter(
    (sc) => !categoryId || sc.categoryId === categoryId
  );

  if (!isOpen || !product) return null;

  const cost = Number(costPrice) || 0;
  const sell = Number(sellingPrice) || 0;
  const marginPercent = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : "0.0";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product Name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await api.updateProduct(product.id, {
        name: name.trim(),
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        brandId: brandId || null,
        unitId: unitId || null,
        costPrice: String(costPrice),
        sellingPrice: String(sellingPrice),
        isServiceItem,
        isActive,
      });
      onUpdate(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete SKU ${product.sku}?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteProduct(product.id);
      onDelete(product.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cannot delete product. It may be referenced in transactions.");
    } finally {
      setDeleting(false);
    }
  };

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={product.name}
        icon={Package}
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
        {/* Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                {product.sku}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isActive
                    ? "bg-success-tint text-success border-success/20"
                    : "bg-danger-tint text-danger border-danger/20"
                }`}
              >
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              {isServiceItem && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-tint text-purple">
                  SERVICE
                </span>
              )}
              {product.category?.name && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-page-bg border border-border text-ink">
                  {product.category.name}
                  {product.subCategory?.name && (
                    <span className="text-primary font-bold"> › {product.subCategory.name}</span>
                  )}
                </span>
              )}
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">{product.name}</h2>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Cost Basis
              </span>
              <span className="text-body-strong font-mono text-ink mt-0.5 block">
                ৳{cost.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Selling Price
              </span>
              <span className="text-body-strong font-mono text-primary font-bold mt-0.5 block">
                ৳{sell.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 rounded-sm bg-page-bg border border-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Gross Margin
              </span>
              <span className="text-body-strong font-mono text-success font-bold mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {marginPercent}%
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <form id="edit-product-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1">
                Item Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-caption font-semibold text-ink mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-text-muted" /> Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    setCategoryId(newCatId);
                    if (subCategoryId && !subCategories.some(sc => sc.id === subCategoryId && sc.categoryId === newCatId)) {
                      setSubCategoryId("");
                    }
                  }}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                >
                  <option value="">(None)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink mb-1 flex items-center gap-1">
                  <FolderTree className="w-3.5 h-3.5 text-text-muted" /> Sub-Category
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
                        : "(No Sub-Categories for Category)"
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
                <label className="block text-caption font-semibold text-ink mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-text-muted" /> Brand
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                >
                  <option value="">(None)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-text-muted" /> Unit
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
                  Standard Cost Price (৳ BDT)
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
                  Standard Selling Price (৳ BDT)
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

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-sm bg-page-bg border border-border flex items-center justify-between">
                <div>
                  <span className="text-body font-semibold text-ink block">Item Active Status</span>
                  <span className="text-caption text-text-muted">
                    Enable or disable this SKU for quotations and sales orders.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div className="p-3 rounded-sm bg-page-bg border border-border flex items-center justify-between">
                <div>
                  <span className="text-body font-semibold text-ink block">Service Line Item</span>
                  <span className="text-caption text-text-muted">
                    Non-physical service item with no inventory deduction.
                  </span>
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
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-page-bg/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-2 text-caption font-semibold rounded-sm border border-danger/30 text-danger hover:bg-danger-tint flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete SKU</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body font-medium rounded-sm border border-border text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-product-form"
              disabled={saving}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
