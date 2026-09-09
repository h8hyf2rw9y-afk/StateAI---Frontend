import { describe, expect, it } from "vitest";
import {
  formatOpportunityLostReason,
  formatOpportunityStage,
  formatOpportunityType,
  formatOpportunityValue,
  isAppointmentUpcoming,
  isTaskOverdue,
} from "@/features/pipeline/types";

describe("formatOpportunityValue", () => {
  it("formats the Decimal-as-string expected_value as currency", () => {
    expect(formatOpportunityValue("450000.00", "MXN")).toMatch(/450,000/);
  });

  it("never fabricates a value when expected_value is null", () => {
    expect(formatOpportunityValue(null, "MXN")).toBe("Value not set");
  });
});

describe("formatOpportunityStage / formatOpportunityType / formatOpportunityLostReason", () => {
  it("labels every real backend stage", () => {
    expect(formatOpportunityStage("negotiation")).toBe("Negotiation");
    expect(formatOpportunityStage("property_selected")).toBe("Property selected");
  });

  it("falls back to the raw string for an unmapped stage instead of crashing", () => {
    expect(formatOpportunityStage("some_future_stage")).toBe("some_future_stage");
  });

  it("labels opportunity_type", () => {
    expect(formatOpportunityType("buy")).toBe("Buy");
    expect(formatOpportunityType("sell")).toBe("Sell");
  });

  it("labels lost_reason, and returns null (not a fabricated label) when there is none", () => {
    expect(formatOpportunityLostReason("chose_another_property")).toBe("Chose another property");
    expect(formatOpportunityLostReason(null)).toBeNull();
  });
});

describe("isTaskOverdue", () => {
  it("is true for a pending task whose due date has passed", () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: pastDue, status: "pending" })).toBe(true);
  });

  it("is false for a task whose due date is in the future", () => {
    const futureDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: futureDue, status: "pending" })).toBe(false);
  });

  it("is false for a completed task even if its due date has passed", () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: pastDue, status: "completed" })).toBe(false);
  });

  it("is false for a cancelled task even if its due date has passed", () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: pastDue, status: "cancelled" })).toBe(false);
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
});
