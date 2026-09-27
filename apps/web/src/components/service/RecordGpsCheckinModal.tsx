"use client";

import React, { useState } from "react";
import { MapPin, AlertCircle, Loader2, Navigation } from "lucide-react";
import { api } from "../../lib/api";
import type { LiveLocationLogDto, ServiceAssignmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface RecordGpsCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (log: LiveLocationLogDto) => void;
  assignment: ServiceAssignmentDto | null;
  employees: { id: string; employeeCode: string; firstName?: string; lastName?: string; fullName?: string }[];
}

export const RecordGpsCheckinModal: React.FC<RecordGpsCheckinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  employees,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [technicianEmployeeId, setTechnicianEmployeeId] = useState(
    assignment?.technicians?.[0]?.employeeId || employees[0]?.id || ""
  );
  const [eventType, setEventType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
  const [latitude, setLatitude] = useState<number>(23.8103); // Default Dhaka latitude
  const [longitude, setLongitude] = useState<number>(90.4125); // Default Dhaka longitude

  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`GPS Visit - ${assignment.assignmentNumber}`}
        icon={MapPin}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser environment.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(`Unable to acquire GPS coordinates: ${err.message}. Enter manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianEmployeeId || isNaN(latitude) || isNaN(longitude)) {
      setError("Please fill in valid technician and coordinates.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        employeeId: technicianEmployeeId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        occurredAt: new Date().toISOString(),
      };

      const result =
        eventType === "CHECK_IN"
          ? await api.recordGpsCheckin(assignment.id, payload)
          : await api.recordGpsCheckout(assignment.id, payload);

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to record GPS visit log");
    } finally {
      setLoading(false);
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
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "relative w-full max-w-lg rounded-md my-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Record Field GPS Visit</h2>
              <p className="text-caption text-text-muted">
                Log live visit timestamp and location coordinates for{" "}
                <span className="font-mono font-semibold text-primary">{assignment.assignmentNumber}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Type Checkin / Checkout */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEventType("CHECK_IN")}
              className={`py-2.5 px-3 rounded-sm border font-semibold text-body transition-colors ${
                eventType === "CHECK_IN"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-page-bg text-ink hover:border-border-hover"
              }`}
            >
              Check-In (Arrival)
            </button>
            <button
              type="button"
              onClick={() => setEventType("CHECK_OUT")}
              className={`py-2.5 px-3 rounded-sm border font-semibold text-body transition-colors ${
                eventType === "CHECK_OUT"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-page-bg text-ink hover:border-border-hover"
              }`}
            >
              Check-Out (Departure)
            </button>
          </div>

          <div>
            <label className="block text-caption font-semibold text-ink mb-1.5">
              Technician <span className="text-danger">*</span>
            </label>
            <select
              value={technicianEmployeeId}
              onChange={(e) => setTechnicianEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
              required
            >
              <option value="">Select technician</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          {/* GPS Coordinates with Browser Auto-Detect */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-caption font-semibold text-ink">
                Geographic Coordinates <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={locating}
                className="text-caption text-primary hover:text-primary-hover flex items-center gap-1 font-medium disabled:opacity-50"
              >
                {locating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Auto-Detect Current GPS</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-text-muted mb-0.5 block">Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary focus:bg-surface outline-none"
                  required
                />
              </div>
              <div>
                <span className="text-[11px] text-text-muted mb-0.5 block">Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary focus:bg-surface outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body rounded-sm border border-border text-ink hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-body font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Record {eventType === "CHECK_IN" ? "Check-In" : "Check-Out"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
