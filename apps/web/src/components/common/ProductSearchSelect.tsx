"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Check, Package, Sparkles } from "lucide-react";
import type { ProductDto } from "@bts/shared-types";
import { api } from "../../lib/api";

export interface ProductSearchSelectProps {
  products: ProductDto[];
  selectedProductId?: string;
  onSelect: (product: ProductDto | null) => void;
  placeholder?: string;
  priceType?: "selling" | "cost" | "none";
  allowCustomItem?: boolean;
  customItemLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showStock?: boolean;
  autoFocus?: boolean;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  selectedProductId,
  onSelect,
  placeholder = "Search product by name or SKU...",
  priceType = "selling",
  allowCustomItem = false,
  customItemLabel = "Custom / Non-Catalog Item",
  required = false,
  disabled = false,
  className = "",
  showStock = true,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [extraProducts, setExtraProducts] = useState<ProductDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allAvailableProducts = useMemo(() => {
    const combined = [...products];
    for (const ep of extraProducts) {
      if (!combined.some((p) => p.id === ep.id)) {
        combined.push(ep);
      }
    }
    return combined;
  }, [products, extraProducts]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return allAvailableProducts.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, allAvailableProducts]);

  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(selectedProduct.name);
    } else if (!allowCustomItem) {
      setSearchTerm("");
    }
  }, [selectedProduct, selectedProductId, allowCustomItem]);

  // Live API Search Debounce
  useEffect(() => {
    if (!isOpen) return;
    const term = searchTerm.trim();
    if (term.length < 2) return;

    const timer = setTimeout(() => {
      setSearching(true);
      api.getProducts({ search: term, take: 50 })
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setExtraProducts((prev) => {
              const next = [...prev];
              for (const item of res.items) {
                if (!next.some((p) => p.id === item.id)) {
                  next.push(item);
                }
              }
              return next;
            });
          }
        })
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  // When dropdown opens, if product pool is small, load fresh catalog
  useEffect(() => {
    if (isOpen && products.length < 30 && extraProducts.length === 0) {
      api.getProducts({ take: 100 })
        .then((res) => {
          if (res.items) {
            setExtraProducts(res.items);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, products.length, extraProducts.length]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allAvailableProducts;
    const term = searchTerm.toLowerCase().trim();
    return allAvailableProducts.filter((p) => {
      const matchName = (p.name || "").toLowerCase().includes(term);
      const matchSku = (p.sku || "").toLowerCase().includes(term);
      const matchCategory = (p.category?.name || "").toLowerCase().includes(term);
      const matchBrand = (p.brand?.name || "").toLowerCase().includes(term);
      const matchModel = (p.modelNumber || "").toLowerCase().includes(term);
      const matchBarcode = (p.barcode || "").toLowerCase().includes(term);
      return matchName || matchSku || matchCategory || matchBrand || matchModel || matchBarcode;
    });
  }, [allAvailableProducts, searchTerm]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const width = Math.max(rect.width, 300);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (openUp) {
      setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left, width, zIndex: 9999 });
    } else {
      setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left, width, zIndex: 9999 });
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setActiveIndex(-1);
    if (inputRef.current) inputRef.current.select();
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (selectedProduct) setSearchTerm(selectedProduct.name);
    else if (!allowCustomItem) setSearchTerm("");
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        handleClose();
      }
    };
    const handleWindowEvents = () => updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleWindowEvents, true);
    window.addEventListener("resize", handleWindowEvents);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleWindowEvents, true);
      window.removeEventListener("resize", handleWindowEvents);
    };
  }, [isOpen, selectedProduct, allowCustomItem]);

  const handleSelectProduct = (prod: ProductDto | null) => {
    onSelect(prod);
    setSearchTerm(prod ? prod.name : "");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearchTerm("");
    if (inputRef.current) inputRef.current.focus();
    setIsOpen(true);
    updatePosition();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); handleOpen(); }
      return;
    }
    const totalItems = filteredProducts.length + (allowCustomItem ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p + 1 >= totalItems ? 0 : p + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((p) => (p - 1 < 0 ? totalItems - 1 : p - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (allowCustomItem && activeIndex === 0) { handleSelectProduct(null); }
      else {
        const pi = allowCustomItem ? activeIndex - 1 : activeIndex;
        if (pi >= 0 && pi < filteredProducts.length) handleSelectProduct(filteredProducts[pi]);
        else if (filteredProducts.length === 1) handleSelectProduct(filteredProducts[0]);
      }
    } else if (e.key === "Escape") { e.preventDefault(); handleClose(); }
  };

  const wrapStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", width: "100%",
    padding: "0 10px", height: "36px", borderRadius: "6px",
    border: isOpen ? "1.5px solid #2F6FED" : "1px solid #E4E6ED",
    boxShadow: isOpen ? "0 0 0 3px rgba(47,111,237,0.12)" : "none",
    backgroundColor: disabled ? "#F5F6FA" : "#ffffff",
    cursor: disabled ? "not-allowed" : "text",
    opacity: disabled ? 0.6 : 1,
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
  };

  const dropdownWrapStyle: React.CSSProperties = {
    ...dropdownStyle,
    backgroundColor: "#ffffff", border: "1px solid #E4E6ED",
    borderRadius: "8px", boxShadow: "0 8px 32px rgba(13,11,51,0.16)",
    overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "288px",
  };

  const renderDropdown = () => {
    if (!isOpen || typeof document === "undefined") return null;
    return createPortal(
      <div ref={listRef} style={dropdownWrapStyle}>
        <div style={{ padding: "5px 12px", backgroundColor: "#F5F6FA", borderBottom: "1px solid #E4E6ED", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#5C5C5C", fontWeight: 500 }}>
          <span>{filteredProducts.length} items found</span>
          <span style={{ fontFamily: "monospace", fontSize: "10px" }}>ESC to close</span>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {allowCustomItem && (
            <div
              onClick={() => handleSelectProduct(null)}
              style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", backgroundColor: activeIndex === 0 ? "rgba(47,111,237,0.10)" : !selectedProductId ? "rgba(47,111,237,0.06)" : "transparent", borderBottom: "1px solid rgba(228,230,237,0.5)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0D0B33", margin: 0 }}>{customItemLabel}</p>
                  <p style={{ fontSize: "11px", color: "#5C5C5C", margin: 0 }}>Enter manual description &amp; price</p>
                </div>
              </div>
              {!selectedProductId && <Check style={{ width: 14, height: 14, color: "#2F6FED", flexShrink: 0 }} />}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div style={{ padding: "20px 12px", textAlign: "center", color: "#5C5C5C" }}>
              <Package style={{ width: 24, height: 24, margin: "0 auto 6px", opacity: 0.4 }} />
              <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 2px" }}>No products found</p>
              <p style={{ fontSize: "11px", margin: 0 }}>No item matching &quot;{searchTerm}&quot;</p>
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const cai = allowCustomItem ? idx + 1 : idx;
              const isSelected = selectedProductId === p.id;
              const isHighlighted = activeIndex === cai;
              const displayPrice = priceType === "selling" ? Number(p.sellingPrice) || 0 : priceType === "cost" ? Number(p.costPrice) || 0 : null;
              const stockCount = p.totalStock ?? 0;
              const inStock = stockCount > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", cursor: "pointer", backgroundColor: isHighlighted ? "rgba(47,111,237,0.08)" : isSelected ? "rgba(47,111,237,0.05)" : "transparent", borderBottom: "1px solid rgba(228,230,237,0.5)" }}
                  onMouseEnter={(e) => { if (!isHighlighted && !isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F5F6FA"; }}
                  onMouseLeave={(e) => { if (!isHighlighted && !isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "#0D0B33", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#F5F6FA", color: "#5C5C5C", border: "1px solid #E4E6ED", flexShrink: 0 }}>{p.sku}</span>
                      {p.category?.name && <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#fff", color: "#5C5C5C", border: "1px solid rgba(228,230,237,0.8)", flexShrink: 0 }}>{p.category.name}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#5C5C5C", marginTop: "2px" }}>
                      {showStock && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 500, color: inStock ? "#16A34A" : "#D73E3D" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: inStock ? "#16A34A" : "#D73E3D", display: "inline-block" }} />
                          {inStock ? `Stock: ${stockCount}` : "Out of Stock"}
                        </span>
                      )}
                      {displayPrice !== null && <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#0D0B33" }}>?{displayPrice.toLocaleString("en-BD")}</span>}
                    </div>
                  </div>
                  {isSelected && <Check style={{ width: 14, height: 14, color: "#2F6FED", flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }} className={className}>
      <div style={wrapStyle} onClick={handleOpen}>
        <Search style={{ width: 14, height: 14, color: "#5C5C5C", flexShrink: 0, marginRight: 6 }} />
        <input
          ref={inputRef} type="text" value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); if (!isOpen) { setIsOpen(true); updatePosition(); } }}
          onFocus={handleOpen} onKeyDown={handleKeyDown}
          placeholder={placeholder} disabled={disabled}
          required={required && !selectedProductId} autoFocus={autoFocus}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#0D0B33", fontWeight: selectedProduct ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
        />
        {selectedProduct && (
          <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#F5F6FA", color: "#5C5C5C", border: "1px solid #E4E6ED", flexShrink: 0, marginLeft: 4 }}>{selectedProduct.sku}</span>
        )}
        {(selectedProductId || searchTerm) && !disabled && (
          <button type="button" onClick={handleClear} title="Clear" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", marginLeft: 4, flexShrink: 0, color: "#5C5C5C", display: "flex", alignItems: "center", borderRadius: "50%" }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
        <ChevronDown style={{ width: 13, height: 13, color: isOpen ? "#2F6FED" : "#5C5C5C", flexShrink: 0, marginLeft: 4, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
      </div>
      {renderDropdown()}
    </div>
  );
};
