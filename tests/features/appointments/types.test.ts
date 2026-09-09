import { describe, expect, it } from "vitest";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  isAppointmentUpcoming,
} from "@/features/appointments/types";

describe("formatAppointmentType / formatAppointmentStatus", () => {
  it("labels every real backend appointment type — including ones the old mock never had", () => {
    expect(formatAppointmentType("showing")).toBe("Showing");
    expect(formatAppointmentType("notary")).toBe("Notary");
    expect(formatAppointmentType("signing")).toBe("Signing");
  });

  it("falls back to the raw string for an unmapped type instead of crashing", () => {
    expect(formatAppointmentType("some_future_type")).toBe("some_future_type");
  });

  it("labels every real backend status", () => {
    expect(formatAppointmentStatus("no_show")).toBe("No-show");
    expect(formatAppointmentStatus("confirmed")).toBe("Confirmed");
  });

  it("falls back to the raw string for an unmapped status instead of crashing", () => {
    expect(formatAppointmentStatus("some_future_status")).toBe("some_future_status");
  });
});

describe("isAppointmentUpcoming", () => {
  it("is true for a scheduled appointment in the future", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isAppointmentUpcoming({ start_at: future, status: "scheduled" })).toBe(true);
  });

  it("is true for a confirmed appointment in the future", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isAppointmentUpcoming({ start_at: future, status: "confirmed" })).toBe(true);
  });

  it("is false for an appointment already in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isAppointmentUpcoming({ start_at: past, status: "scheduled" })).toBe(false);
  });

  it("is false for a cancelled future appointment", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isAppointmentUpcoming({ start_at: future, status: "cancelled" })).toBe(false);
  });

  it("is false for a completed future-dated appointment (data-entry edge case, not just past ones)", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isAppointmentUpcoming({ start_at: future, status: "completed" })).toBe(false);
  });
});
