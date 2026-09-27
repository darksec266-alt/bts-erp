"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Check, User, Phone, Building2 } from "lucide-react";
import type { CustomerDto } from "@bts/shared-types";
import { api } from "../../lib/api";

export interface CustomerSearchSelectProps {
  customers: CustomerDto[];
  selectedCustomerId?: string;
  onSelect: (customer: CustomerDto | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
  customers,
  selectedCustomerId,
  onSelect,
  placeholder = "Search customer by name, code, or phone...",
  required = false,
  disabled = false,
  className = "",
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [extraCustomers, setExtraCustomers] = useState<CustomerDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allAvailableCustomers = useMemo(() => {
    const combined = [...customers];
    for (const ec of extraCustomers) {
      if (!combined.some((c) => c.id === ec.id)) {
        combined.push(ec);
      }
    }
    return combined;
  }, [customers, extraCustomers]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return allAvailableCustomers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, allAvailableCustomers]);

  useEffect(() => {
    if (selectedCustomer) {
      setSearchTerm(selectedCustomer.displayName);
    } else {
      setSearchTerm("");
    }
  }, [selectedCustomer, selectedCustomerId]);

  // Live API Search Debounce
  useEffect(() => {
    if (!isOpen) return;
    const term = searchTerm.trim();
    if (term.length < 2) return;

    const timer = setTimeout(() => {
      setSearching(true);
      api.getCustomers({ search: term, take: 50 })
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setExtraCustomers((prev) => {
              const next = [...prev];
              for (const item of res.items) {
                if (!next.some((c) => c.id === item.id)) {
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

  // When dropdown opens, if customer pool is small, load fresh catalog
  useEffect(() => {
    if (isOpen && customers.length < 30 && extraCustomers.length === 0) {
      api.getCustomers({ take: 100 })
        .then((res) => {
          if (res.items) {
            setExtraCustomers(res.items);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, customers.length, extraCustomers.length]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return allAvailableCustomers;
    const term = searchTerm.toLowerCase().trim();
    return allAvailableCustomers.filter((c) => {
      const matchName = (c.displayName || "").toLowerCase().includes(term);
      const matchCode = (c.customerCode || "").toLowerCase().includes(term);
      const matchPhone = (c.phone || "").toLowerCase().includes(term);
      return matchName || matchCode || matchPhone;
    });
  }, [allAvailableCustomers, searchTerm]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    const width = Math.max(rect.width, 320);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (openUp) {
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left,
        width,
        zIndex: 9999,
      });
    } else {
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left,
        width,
        zIndex: 9999,
      });
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
    if (selectedCustomer) setSearchTerm(selectedCustomer.displayName);
    else setSearchTerm("");
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
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
  }, [isOpen, selectedCustomer]);

  const handleSelectCustomer = (customer: CustomerDto | null) => {
    onSelect(customer);
    setSearchTerm(customer ? customer.displayName : "");
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
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    const totalItems = filteredCustomers.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => (p + 1 >= totalItems ? 0 : p + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => (p - 1 < 0 ? totalItems - 1 : p - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredCustomers.length) {
        handleSelectCustomer(filteredCustomers[activeIndex]);
      } else if (filteredCustomers.length === 1) {
        handleSelectCustomer(filteredCustomers[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const wrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "0 10px",
    height: "38px",
    borderRadius: "4px",
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
    backgroundColor: "#ffffff",
    border: "1px solid #E4E6ED",
    borderRadius: "6px",
    boxShadow: "0 8px 32px rgba(13,11,51,0.16)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "288px",
  };

  const renderDropdown = () => {
    if (!isOpen || typeof document === "undefined") return null;
    return createPortal(
      <div ref={listRef} style={dropdownWrapStyle}>
        <div
          style={{
            padding: "6px 12px",
            backgroundColor: "#F5F6FA",
            borderBottom: "1px solid #E4E6ED",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#5C5C5C",
            fontWeight: 500,
          }}
        >
          <span>{filteredCustomers.length} customers found</span>
          <span style={{ fontFamily: "monospace", fontSize: "10px" }}>
            ESC to close
          </span>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredCustomers.length === 0 ? (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: "#5C5C5C",
              }}
            >
              <User
                style={{
                  width: 24,
                  height: 24,
                  margin: "0 auto 6px",
                  opacity: 0.4,
                }}
              />
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  margin: "0 0 2px",
                  color: "#0D0B33",
                }}
              >
                No customers found
              </p>
              <p style={{ fontSize: "11px", margin: 0 }}>
                No match for &quot;{searchTerm}&quot;
              </p>
            </div>
          ) : (
            filteredCustomers.map((c, idx) => {
              const isSelected = selectedCustomerId === c.id;
              const isHighlighted = activeIndex === idx;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  style={{
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: "pointer",
                    backgroundColor: isHighlighted
                      ? "rgba(47,111,237,0.08)"
                      : isSelected
                      ? "rgba(47,111,237,0.05)"
                      : "transparent",
                    borderBottom: "1px solid rgba(228,230,237,0.5)",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isHighlighted && !isSelected)
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        "#F5F6FA";
                  }}
                  onMouseLeave={(e) => {
                    if (!isHighlighted && !isSelected)
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        "transparent";
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#0D0B33",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.displayName}
                      </span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          backgroundColor: "#F5F6FA",
                          color: "#5C5C5C",
                          border: "1px solid #E4E6ED",
                          flexShrink: 0,
                        }}
                      >
                        {c.customerCode}
                      </span>
                      {c.isServiceOnly && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            backgroundColor: "#FEF3C7",
                            color: "#B45309",
                            border: "1px solid #FCD34D",
                            flexShrink: 0,
                            fontWeight: 500,
                          }}
                        >
                          Service-Only
                        </span>
                      )}
                    </div>
                    {c.phone && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          color: "#5C5C5C",
                          marginTop: "2px",
                        }}
                      >
                        <Phone style={{ width: 11, height: 11, opacity: 0.7 }} />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      style={{
                        width: 15,
                        height: 15,
                        color: "#2F6FED",
                        flexShrink: 0,
                      }}
                    />
                  )}
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
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
      className={className}
    >
      <div style={wrapStyle} onClick={handleOpen}>
        <Search
          style={{
            width: 14,
            height: 14,
            color: "#5C5C5C",
            flexShrink: 0,
            marginRight: 6,
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
              updatePosition();
            }
          }}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !selectedCustomerId}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            color: "#0D0B33",
            fontWeight: selectedCustomer ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        />
        {selectedCustomer && (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              padding: "1px 5px",
              borderRadius: "3px",
              backgroundColor: "#F5F6FA",
              color: "#5C5C5C",
              border: "1px solid #E4E6ED",
              flexShrink: 0,
              marginLeft: 4,
            }}
          >
            {selectedCustomer.customerCode}
          </span>
        )}
        {(selectedCustomerId || searchTerm) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear customer selection"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              marginLeft: 4,
              flexShrink: 0,
              color: "#5C5C5C",
              display: "flex",
              alignItems: "center",
              borderRadius: "50%",
            }}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
        <ChevronDown
          style={{
            width: 13,
            height: 13,
            color: isOpen ? "#2F6FED" : "#5C5C5C",
            flexShrink: 0,
            marginLeft: 4,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </div>
      {renderDropdown()}
    </div>
  );
};
