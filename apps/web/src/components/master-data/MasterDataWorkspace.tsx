"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Layers,
  FolderTree,
  Tag,
  Scale,
  Warehouse,
  Building,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CategoryDto,
  SubCategoryDto,
  BrandDto,
  UnitDto,
  WarehouseDto,
  DepartmentDto,
  TaxRateDto,
  BranchDto,
} from "@bts/shared-types";
import { ToastContainer, type ToastMessage } from "../common/Toast";

type MasterDataTab =
  | "categories"
  | "sub-categories"
  | "brands"
  | "units"
  | "warehouses"
  | "departments"
  | "tax-rates";

export const MasterDataWorkspace: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get("tab") as MasterDataTab) || "categories";
  const [activeTab, setActiveTab] = useState<MasterDataTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab") as MasterDataTab | null;
    if (tab && ["categories", "sub-categories", "brands", "units", "warehouses", "departments", "tax-rates"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Data states
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Modals & Editing
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    name?: string;
    code?: string;
    ratePercent?: number;
    branchId?: string;
    categoryId?: string;
    isActive: boolean;
  } | null>(null);

  // Form states for adding
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formRate, setFormRate] = useState("15");
  const [formBranchId, setFormBranchId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTabChange = (tab: MasterDataTab) => {
    setActiveTab(tab);
    setSearch("");
    router.push(`/master-data?tab=${tab}`, { scroll: false });
  };

  // Load branches once
  useEffect(() => {
    api.getBranches().then((res) => {
      setBranches(res.items);
      if (res.items[0]) setFormBranchId(res.items[0].id);
    }).catch(() => {});
  }, []);

  // Fetch data for the active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "categories") {
        const res = await api.getCategories({ take: 100 });
        setCategories(res.items);
      } else if (activeTab === "sub-categories") {
        const [subRes, catRes] = await Promise.all([
          api.getSubCategories({ take: 100 }),
          api.getCategories({ take: 100 }),
        ]);
        setSubCategories(subRes.items);
        setCategories(catRes.items);
      } else if (activeTab === "brands") {
        const res = await api.getBrands({ take: 100 });
        setBrands(res.items);
      } else if (activeTab === "units") {
        const res = await api.getUnits({ take: 100 });
        setUnits(res.items);
      } else if (activeTab === "warehouses") {
        const res = await api.getWarehouses({ take: 100 });
        setWarehouses(res.items);
      } else if (activeTab === "departments") {
        const res = await api.getDepartments({ take: 100 });
        setDepartments(res.items);
      } else if (activeTab === "tax-rates") {
        const res = await api.getTaxRates({ take: 100 });
        setTaxRates(res.items);
      }
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to load master records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (activeTab === "categories") {
        if (!formName.trim()) throw new Error("Category name is required.");
        await api.createCategory({ name: formName.trim() });
      } else if (activeTab === "sub-categories") {
        if (!formCategoryId) throw new Error("Please select a parent category.");
        if (!formName.trim()) throw new Error("Sub-category name is required.");
        await api.createSubCategory({ categoryId: formCategoryId, name: formName.trim() });
      } else if (activeTab === "brands") {
        if (!formName.trim()) throw new Error("Brand name is required.");
        await api.createBrand({ name: formName.trim() });
      } else if (activeTab === "units") {
        if (!formCode.trim() || !formName.trim()) throw new Error("Code and Unit name are required.");
        await api.createUnit({ code: formCode.trim().toUpperCase(), name: formName.trim() });
      } else if (activeTab === "warehouses") {
        if (!formCode.trim() || !formName.trim()) throw new Error("Code and Warehouse name are required.");
        await api.createWarehouse({
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          branchId: formBranchId || undefined,
        });
      } else if (activeTab === "departments") {
        if (!formName.trim()) throw new Error("Department name is required.");
        await api.createDepartment({ name: formName.trim() });
      } else if (activeTab === "tax-rates") {
        if (!formName.trim()) throw new Error("Tax rate name is required.");
        await api.createTaxRate({ name: formName.trim(), ratePercent: Number(formRate) || 0 });
      }

      addToast("success", "Record created successfully!");
      setAddModalOpen(false);
      setFormName("");
      setFormCode("");
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create record");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (activeTab === "categories") {
        await api.updateCategory(editingItem.id, { name: editingItem.name, isActive: editingItem.isActive });
      } else if (activeTab === "sub-categories") {
        if (!editingItem.categoryId) throw new Error("Parent category is required.");
        if (!editingItem.name?.trim()) throw new Error("Sub-category name is required.");
        await api.updateSubCategory(editingItem.id, {
          categoryId: editingItem.categoryId,
          name: editingItem.name.trim(),
          isActive: editingItem.isActive,
        });
      } else if (activeTab === "brands") {
        await api.updateBrand(editingItem.id, { name: editingItem.name, isActive: editingItem.isActive });
      } else if (activeTab === "units") {
        await api.updateUnit(editingItem.id, { code: editingItem.code, name: editingItem.name, isActive: editingItem.isActive });
      } else if (activeTab === "warehouses") {
        await api.updateWarehouse(editingItem.id, {
          code: editingItem.code,
          name: editingItem.name,
          branchId: editingItem.branchId || undefined,
          isActive: editingItem.isActive,
        });
      } else if (activeTab === "departments") {
        await api.updateDepartment(editingItem.id, { name: editingItem.name, isActive: editingItem.isActive });
      } else if (activeTab === "tax-rates") {
        await api.updateTaxRate(editingItem.id, {
          name: editingItem.name,
          ratePercent: Number(editingItem.ratePercent) || 0,
          isActive: editingItem.isActive,
        });
      }

      addToast("success", "Record updated successfully!");
      setEditingItem(null);
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update record");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete ${label}?`)) return;
    try {
      if (activeTab === "categories") await api.deleteCategory(id);
      else if (activeTab === "sub-categories") await api.deleteSubCategory(id);
      else if (activeTab === "brands") await api.deleteBrand(id);
      else if (activeTab === "units") await api.deleteUnit(id);
      else if (activeTab === "warehouses") await api.deleteWarehouse(id);
      else if (activeTab === "departments") await api.deleteDepartment(id);
      else if (activeTab === "tax-rates") await api.deleteTaxRate(id);

      addToast("info", `${label} removed`);
      fetchData();
    } catch (err: unknown) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Cannot delete record as it is currently in use."
      );
    }
  };

  const tabs = [
    { id: "categories", label: "Categories", icon: Layers, count: categories.length },
    { id: "sub-categories", label: "Sub-Categories", icon: FolderTree, count: subCategories.length },
    { id: "brands", label: "Brands", icon: Tag, count: brands.length },
    { id: "units", label: "Units of Measure", icon: Scale, count: units.length },
    { id: "warehouses", label: "Warehouses", icon: Warehouse, count: warehouses.length },
    { id: "departments", label: "Departments", icon: Building, count: departments.length },
    { id: "tax-rates", label: "Tax Rates", icon: Percent, count: taxRates.length },
  ] as const;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">Configuration</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Categories, brands, units, warehouses, departments, and tax rates.
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
            onClick={() => {
              setFormError(null);
              setFormName("");
              setFormCode(
                activeTab === "units"
                  ? "PCS"
                  : activeTab === "warehouses"
                  ? `WH-0${warehouses.length + 1}`
                  : ""
              );
              if (activeTab === "sub-categories") {
                if (categories.length === 0) {
                  api.getCategories({ take: 100 }).then((r) => {
                    setCategories(r.items);
                    if (r.items[0]) setFormCategoryId(r.items[0].id);
                  });
                } else if (!formCategoryId && categories[0]) {
                  setFormCategoryId(categories[0].id);
                }
              }
              setAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {tabs.find((t) => t.id === activeTab)?.label.split(" ")[0] || "Item"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto bg-surface px-3 rounded-t-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as MasterDataTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-ink"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-medium ml-0.5 ${
                  isActive ? "bg-primary/10 text-primary" : "bg-page-bg text-text-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-md border border-border bg-surface shadow-elevation-1">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-9 pr-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
          />
        </div>
      </div>

      {/* Content Table for Active Tab */}
      <div className="border border-border rounded-md bg-surface shadow-elevation-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body">
            <thead className="bg-page-bg text-text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                {(activeTab === "units" || activeTab === "warehouses") && (
                  <th className="py-3 px-4 w-32">Code</th>
                )}
                {activeTab === "sub-categories" && (
                  <th className="py-3 px-4 w-48">Parent Category</th>
                )}
                <th className="py-3 px-4">Name / Description</th>
                {activeTab === "warehouses" && <th className="py-3 px-4">Branch</th>}
                {activeTab === "tax-rates" && <th className="py-3 px-4 w-32">Rate (%)</th>}
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-[13px]">Loading...</p>
                  </td>
                </tr>
              ) : (
                (() => {
                  let items: Array<{
                    id: string;
                    name?: string;
                    code?: string;
                    ratePercent?: number;
                    branchId?: string | null;
                    categoryId?: string | null;
                    category?: { id: string; name: string } | null;
                    isActive: boolean;
                  }> = [];

                  if (activeTab === "categories") items = categories;
                  else if (activeTab === "sub-categories") items = subCategories;
                  else if (activeTab === "brands") items = brands;
                  else if (activeTab === "units") items = units;
                  else if (activeTab === "warehouses") items = warehouses;
                  else if (activeTab === "departments") items = departments;
                  else if (activeTab === "tax-rates") items = taxRates;

                  const filtered = items.filter((item) => {
                    const q = search.toLowerCase();
                    const n = (item.name || "").toLowerCase();
                    const c = (item.code || "").toLowerCase();
                    const cat = (item.category?.name || "").toLowerCase();
                    return n.includes(q) || c.includes(q) || cat.includes(q);
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-text-muted">
                          <p className="text-body font-semibold text-ink">No records found</p>
                          <p className="text-caption mt-1">
                            Click &quot;Add {tabs.find((t) => t.id === activeTab)?.label.slice(0, -1) || "Item"}&quot; to register a record.
                          </p>
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-page-bg/40 transition-colors">
                      {(activeTab === "units" || activeTab === "warehouses") && (
                        <td className="py-3 px-4 font-mono font-bold text-xs text-primary">
                          {item.code}
                        </td>
                      )}
                      {activeTab === "sub-categories" && (
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-tint text-primary border border-primary/20">
                            {item.category?.name || categories.find((c) => c.id === item.categoryId)?.name || "—"}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-ink">{item.name}</td>
                      {activeTab === "warehouses" && (
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {branches.find((b) => b.id === item.branchId)?.name || "All Branches"}
                        </td>
                      )}
                      {activeTab === "tax-rates" && (
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {item.ratePercent}%
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                            item.isActive
                              ? "bg-success-tint text-success border-success/20"
                              : "bg-danger-tint text-danger border-danger/20"
                          }`}
                        >
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setFormError(null);
                              setEditingItem({
                                id: item.id,
                                name: item.name,
                                code: item.code,
                                ratePercent: item.ratePercent,
                                branchId: item.branchId || undefined,
                                categoryId: item.categoryId || undefined,
                                isActive: item.isActive,
                              });
                            }}
                            className="p-1 rounded text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name || item.code || "record")}
                            className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger-tint transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-md shadow-elevation-2 border border-border w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/40">
              <h3 className="text-h3 text-ink font-bold capitalize">Add New {activeTab.slice(0, -1)}</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-page-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {(activeTab === "units" || activeTab === "warehouses") && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 text-body font-mono uppercase rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                    placeholder="e.g. PCS, WH-01"
                    required
                  />
                </div>
              )}

              {activeTab === "sub-categories" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Parent Category <span className="text-danger">*</span>
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-caption text-danger mt-1">
                      No categories found. Please create a Category first.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-caption font-semibold text-ink mb-1">
                  Name / Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                  placeholder={
                    activeTab === "sub-categories"
                      ? "e.g. IP Cameras, Analog HD, Connectors"
                      : "e.g. Pieces, Central Warehouse"
                  }
                  required
                />
              </div>

              {activeTab === "warehouses" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                  >
                    <option value="">(All Branches)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "tax-rates" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Tax Percentage (%) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-body font-medium rounded-sm border border-border text-ink hover:bg-page-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-md shadow-elevation-2 border border-border w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/40">
              <h3 className="text-h3 text-ink font-bold">Edit Record</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-sm text-text-muted hover:text-ink hover:bg-page-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {(activeTab === "units" || activeTab === "warehouses") && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.code || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-body font-mono uppercase rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                    required
                  />
                </div>
              )}

              {activeTab === "sub-categories" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Parent Category <span className="text-danger">*</span>
                  </label>
                  <select
                    value={editingItem.categoryId || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-caption font-semibold text-ink mb-1">
                  Name / Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                  required
                />
              </div>

              {activeTab === "warehouses" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={editingItem.branchId || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, branchId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                  >
                    <option value="">(All Branches)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "tax-rates" && (
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1">
                    Tax Percentage (%) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.ratePercent || 0}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, ratePercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-body font-mono rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                    required
                  />
                </div>
              )}

              <div className="p-3 rounded-sm bg-page-bg border border-border flex items-center justify-between">
                <span className="text-body font-semibold text-ink">Active Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isActive}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isActive: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-body font-medium rounded-sm border border-border text-ink hover:bg-page-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
