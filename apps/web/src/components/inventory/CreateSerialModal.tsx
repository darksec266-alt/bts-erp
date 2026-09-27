"use client";

import React, { useState, useRef } from "react";
import { QrCode, Loader2, AlertCircle, Upload, Download, CheckCircle2, FileText, ListPlus } from "lucide-react";
import { api } from "../../lib/api";
import type { ProductDto, SerialNumberDto, SKULifecycleStage } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateSerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serial: SerialNumberDto) => void;
  products: ProductDto[];
}

export const CreateSerialModal: React.FC<CreateSerialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
}) => {
  const [mode, setMode] = useState<"SINGLE" | "BULK">("SINGLE");
  const [productId, setProductId] = useState("");
  const [serial, setSerial] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [currentStage, setCurrentStage] = useState<SKULifecycleStage>("RECEIVED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Register Serial Number"
        icon={QrCode}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  // Parse bulk tokens from string
  const parseTokens = (raw: string): string[] => {
    return raw
      .split(/[\r\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const parsedBulkSerials = Array.from(new Set(parseTokens(bulkInput)));

  // Handle CSV/TXT file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setError("Uploaded file is empty.");
        return;
      }

      // Detect header
      const headerLine = lines[0].toLowerCase();
      let startIndex = 0;
      let targetColIndex = 0;

      if (
        headerLine.includes("serial") ||
        headerLine.includes("sn") ||
        headerLine.includes("barcode") ||
        headerLine.includes("code")
      ) {
        startIndex = 1;
        const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
        const matchIdx = headers.findIndex(
          (h) => h === "serial" || h === "serial_number" || h === "serialnumber" || h === "sn" || h.includes("serial")
        );
        if (matchIdx !== -1) targetColIndex = matchIdx;
      }

      const extracted: string[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(/[,;\t]/).map((p) => p.trim());
        const val = parts[targetColIndex] || parts[0];
        if (val) extracted.push(val);
      }

      if (extracted.length === 0) {
        setError("No valid serial numbers extracted from file.");
        return;
      }

      // Append or set bulk input
      setBulkInput((prev) => {
        const prevTokens = parseTokens(prev);
        const combined = Array.from(new Set([...prevTokens, ...extracted]));
        return combined.join("\n");
      });
      setSuccessInfo(`Loaded ${extracted.length} serial(s) from ${file.name}`);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,serial_number\nSN-DEMO-001\nSN-DEMO-002\nSN-DEMO-003\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "serial_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError("Please select a serialized product.");
      return;
    }

    if (mode === "SINGLE") {
      if (!serial.trim()) {
        setError("Please enter a unique serial number.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await api.createSerialNumber({
          productId,
          serial: serial.trim(),
          currentStage,
        });
        onSuccess(res);
        onClose();
        setProductId("");
        setSerial("");
        setCurrentStage("RECEIVED");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to register serial number.");
      } finally {
        setLoading(false);
      }
    } else {
      // BULK MODE
      if (parsedBulkSerials.length === 0) {
        setError("Please enter or upload at least one serial number.");
        return;
      }

      setLoading(true);
      setError(null);
      setSuccessInfo(null);
      setProgress({ current: 0, total: parsedBulkSerials.length });

      let createdCount = 0;
      const failedSerials: { serial: string; error: string }[] = [];
      let lastCreated: SerialNumberDto | null = null;

      for (let i = 0; i < parsedBulkSerials.length; i++) {
        const s = parsedBulkSerials[i];
        try {
          const res = await api.createSerialNumber({
            productId,
            serial: s,
            currentStage,
          });
          createdCount++;
          lastCreated = res;
        } catch (err: unknown) {
          failedSerials.push({
            serial: s,
            error: err instanceof Error ? err.message : "Error creating serial",
          });
        }
        setProgress({ current: i + 1, total: parsedBulkSerials.length });
      }

      setLoading(false);
      setProgress(null);

      if (lastCreated) {
        onSuccess(lastCreated);
      }

      if (failedSerials.length === 0) {
        setSuccessInfo(`Successfully created all ${createdCount} serial number(s)!`);
        setTimeout(() => {
          onClose();
          setProductId("");
          setBulkInput("");
          setSerial("");
        }, 1200);
      } else {
        const remaining = failedSerials.map((f) => f.serial).join("\n");
        setBulkInput(remaining);
        setError(
          `Registered ${createdCount} serial(s). ${failedSerials.length} serial(s) failed (kept in box for review): ${failedSerials[0].error}`
        );
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0"
            : "relative w-full max-w-lg rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">Register Serial Number</h2>
              <p className="text-caption text-text-muted mt-0.5">Unique serialized SKU lifecycle tracking & bulk upload</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm flex items-start gap-2 text-danger text-body">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-body">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Mode Switch */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setMode("SINGLE")}
              className={`px-3 py-1.5 rounded-sm text-caption font-medium flex items-center gap-1.5 transition-colors ${
                mode === "SINGLE"
                  ? "bg-primary text-surface shadow-xs"
                  : "bg-surface text-text-muted hover:bg-page-bg"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Single Serial
            </button>
            <button
              type="button"
              onClick={() => setMode("BULK")}
              className={`px-3 py-1.5 rounded-sm text-caption font-medium flex items-center gap-1.5 transition-colors ${
                mode === "BULK"
                  ? "bg-primary text-surface shadow-xs"
                  : "bg-surface text-text-muted hover:bg-page-bg"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Bulk Upload / Paste
            </button>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Product <span className="text-danger">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select serialized product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}]
                </option>
              ))}
            </select>
          </div>

          {mode === "SINGLE" ? (
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Serial Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="e.g. SN-8921849102"
                className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                required={mode === "SINGLE"}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-caption font-medium text-text-muted">
                  Serial Numbers List ({parsedBulkSerials.length} detected) <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3 h-3" />
                    Template CSV
                  </button>
                </div>
              </div>

              {/* File upload button */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 border border-dashed border-border hover:border-primary rounded-sm bg-page-bg/40 text-caption font-medium text-ink flex items-center justify-center gap-2 hover:bg-page-bg transition-colors"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  <span>Upload CSV or TXT file</span>
                </button>
              </div>

              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={5}
                placeholder="Paste serial numbers here separated by newlines, commas, or tabs..."
                className="w-full p-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
              />
              <p className="text-[11px] text-text-muted">
                Accepts multi-line text, comma-separated values, or direct upload of spreadsheets/files (.csv, .txt, .tsv).
              </p>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Initial Stage</label>
            <select
              value={currentStage}
              onChange={(e) => setCurrentStage(e.target.value as SKULifecycleStage)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="RECEIVED">RECEIVED (In receipt inspection)</option>
              <option value="IN_STOCK">IN_STOCK (Available in warehouse)</option>
              <option value="RESERVED">RESERVED (Allocated to project/order)</option>
            </select>
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-caption text-text-muted">
                <span>Registering serials...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 transition-all duration-150"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-sm bg-primary hover:bg-primary-hover text-surface text-body font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? mode === "BULK"
                    ? `Registering (${progress?.current || 0}/${progress?.total || parsedBulkSerials.length})...`
                    : "Registering..."
                  : mode === "BULK"
                  ? `Add ${parsedBulkSerials.length > 0 ? parsedBulkSerials.length : ""} Serials`
                  : "Add Serial"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

