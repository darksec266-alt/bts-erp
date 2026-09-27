"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  Wrench,
  CheckCircle2,
  Box,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  ProductDto,
  CategoryDto,
  SubCategoryDto,
  BrandDto,
  UnitDto,
} from "@bts/shared-types";
import { CreateProductModal } from "./CreateProductModal";
import { ProductDetailDrawer } from "./ProductDetailDrawer";
import { ToastContainer, type ToastMessage } from "../common/Toast";

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PHYSICAL" | "SERVICE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial load of master options
  useEffect(() => {
    Promise.all([
      api.getCategories({ take: 100 }).catch(() => ({ items: [], total: 0 })),
      api.getSubCategories({ take: 200 }).catch(() => ({ items: [], total: 0 })),
      api.getBrands({ take: 100 }).catch(() => ({ items: [], total: 0 })),
      api.getUnits({ take: 100 }).catch(() => ({ items: [], total: 0 })),
    ]).then(([catRes, subCatRes, brandRes, unitRes]) => {
      setCategories(catRes.items);
      setSubCategories(subCatRes.items);
      setBrands(brandRes.items);
      setUnits(unitRes.items);
    });
  }, []);

  // Fetch products with current filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const isService =
        typeFilter === "SERVICE" ? true : typeFilter === "PHYSICAL" ? false : undefined;
      const isActive =
        statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined;

      const res = await api.getProducts({
        search: search.trim() || undefined,
        categoryId: categoryFilter || undefined,
        subCategoryId: subCategoryFilter || undefined,
        brandId: brandFilter || undefined,
        isServiceItem: isService,
        isActive,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, categoryFilter, subCategoryFilter, brandFilter, typeFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // CSV Export
  const handleExportCsv = () => {
    if (products.length === 0) {
      addToast("info", "No products available to export.");
      return;
    }

    const headers = [
      "SKU",
      "Name",
      "Category",
      "Sub-Category",
      "Brand",
      "Unit",
      "Cost Price (BDT)",
      "Selling Price (BDT)",
      "Type",
      "Status",
    ];

    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category?.name || "N/A",
      p.subCategory?.name || "N/A",
      p.brand?.name || "N/A",
      p.unit?.code || "PCS",
      p.costPrice,
      p.sellingPrice,
      p.isServiceItem ? "Service" : "Physical",
      p.isActive ? "Active" : "Inactive",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products-catalog-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", `Exported ${products.length} products to CSV`);
  };

  // Metrics
  const activeCount = products.filter((p) => p.isActive).length;
  const serviceCount = products.filter((p) => p.isServiceItem).length;
  const physicalCount = products.filter((p) => !p.isServiceItem).length;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">Products</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Product catalog, pricing, and unit masters.
          </p>
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
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Product
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total SKUs</p>
          <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{totalCount}</p>
          <p className="text-[11px] text-text-muted mt-0.5">Catalog items</p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Active</p>
          <p className="text-h1 font-bold text-success mt-1 tabular-nums">{activeCount}</p>
          <p className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready for sale
          </p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Physical</p>
          <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{physicalCount}</p>
          <p className="text-[11px] text-text-muted mt-0.5">Stock-tracked</p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Services</p>
          <p className="text-h1 font-bold text-warning mt-1 tabular-nums">{serviceCount}</p>
          <p className="text-[11px] text-warning font-medium mt-0.5">Non-stocked</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-md border border-border bg-surface shadow-elevation-1 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by SKU or item name..."
              className="w-full pl-9 pr-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategoryFilter(newCat);
                if (subCategoryFilter && !subCategories.some(sc => sc.id === subCategoryFilter && sc.categoryId === newCat)) {
                  setSubCategoryFilter("");
                }
                setPage(1);
              }}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={subCategoryFilter}
              onChange={(e) => {
                setSubCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="">All Sub-Categories</option>
              {subCategories
                .filter((sc) => !categoryFilter || sc.categoryId === categoryFilter)
                .map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Brand Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="w-full md:w-40">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "ALL" | "PHYSICAL" | "SERVICE");
                setPage(1);
              }}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="PHYSICAL">Physical Goods</option>
              <option value="SERVICE">Services Only</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-36">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setPage(1);
              }}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Products Data Table */}
      <div className="border border-border rounded-md bg-surface shadow-elevation-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body">
            <thead className="bg-page-bg text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Cost (৳)</th>
                <th className="py-3 px-4 text-right">Price (৳)</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-body font-medium">Loading catalog records from database...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    <Package className="w-10 h-10 mx-auto text-border mb-2" />
                    <p className="text-body font-semibold text-ink">No products found</p>
                    <p className="text-caption mt-1">
                      {search || categoryFilter || brandFilter
                        ? "Try clearing your search or filters."
                        : "Click 'New Product' to create your first catalog SKU."}
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const cost = Number(p.costPrice) || 0;
                  const sell = Number(p.sellingPrice) || 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-page-bg/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(p);
                        setDrawerOpen(true);
                      }}
                    >
                      <td className="py-3 px-4 font-mono text-xs font-bold text-primary">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-caption text-text-muted">
                        <div className="flex flex-col gap-0.5 items-start">
                          {p.category?.name ? (
                            <span className="px-2 py-0.5 rounded bg-page-bg border border-border text-ink font-medium">
                              {p.category.name}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                          {p.subCategory?.name && (
                            <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono pl-1">
                              <span className="text-border">↳</span>
                              <span className="text-primary font-medium">{p.subCategory.name}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-caption text-text-muted">
                        {p.brand?.name ? (
                          <span className="px-2 py-0.5 rounded bg-page-bg border border-border text-ink">
                            {p.brand.name}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-caption font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-page-bg border border-border text-text-muted">
                          {p.unit?.code || "PCS"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-caption text-text-muted">
                        ৳{cost.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-body font-bold text-ink">
                        ৳{sell.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.isServiceItem ? (
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-tint text-purple">
                            Service
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-page-bg text-text-muted border border-border">
                            Physical
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                            p.isActive
                              ? "bg-success-tint text-success border-success/20"
                              : "bg-danger-tint text-danger border-danger/20"
                          }`}
                        >
                          {p.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                            setDrawerOpen(true);
                          }}
                          className="px-2.5 py-1 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink inline-flex items-center gap-1 transition-colors shadow-elevation-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption text-text-muted">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-border bg-surface text-ink outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {products.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, totalCount)} of {totalCount} records
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-border bg-surface hover:bg-page-bg disabled:opacity-40 disabled:hover:bg-surface text-ink transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-body font-mono text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-border bg-surface hover:bg-page-bg disabled:opacity-40 disabled:hover:bg-surface text-ink transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(created) => {
          addToast("success", `Product ${created.sku} registered successfully!`);
          setProducts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
          setTotalCount((prev) => prev + 1);
          setPage(1);
          fetchProducts();
        }}
        categories={categories}
        subCategories={subCategories}
        brands={brands}
        units={units}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={selectedProduct}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedProduct(null);
        }}
        onUpdate={(updated) => {
          addToast("success", `Product ${updated.sku} updated!`);
          fetchProducts();
        }}
        onDelete={(_deletedId) => {
          addToast("info", "Product deleted successfully");
          fetchProducts();
        }}
        categories={categories}
        subCategories={subCategories}
        brands={brands}
        units={units}
      />
    </div>
  );
};
