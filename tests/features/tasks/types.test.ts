import { describe, expect, it } from "vitest";
import {
  formatTaskPriority,
  formatTaskStatus,
  formatTaskType,
  isTaskOverdue,
} from "@/features/tasks/types";

describe("formatTaskType / formatTaskStatus / formatTaskPriority", () => {
  it("labels every real backend task type", () => {
    expect(formatTaskType("follow_up")).toBe("Follow-up");
    expect(formatTaskType("notary")).toBe("Notary");
    expect(formatTaskType("commission")).toBe("Commission");
  });

  it("falls back to the raw string for an unmapped type instead of crashing", () => {
    expect(formatTaskType("some_future_type")).toBe("some_future_type");
  });

  it("labels every real backend status", () => {
    expect(formatTaskStatus("in_progress")).toBe("In progress");
    expect(formatTaskStatus("completed")).toBe("Completed");
  });

  it("falls back to the raw string for an unmapped status instead of crashing", () => {
    expect(formatTaskStatus("some_future_status")).toBe("some_future_status");
  });

  it("labels every real backend priority", () => {
    expect(formatTaskPriority("urgent")).toBe("Urgent");
    expect(formatTaskPriority("low")).toBe("Low");
  });

  it("falls back to the raw string for an unmapped priority instead of crashing", () => {
    expect(formatTaskPriority("some_future_priority")).toBe("some_future_priority");
  });
});

describe("isTaskOverdue", () => {
  it("is true for a pending task whose due date has passed", () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: pastDue, status: "pending" })).toBe(true);
  });

  it("is true for an in-progress task whose due date has passed", () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isTaskOverdue({ due_at: pastDue, status: "in_progress" })).toBe(true);
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
