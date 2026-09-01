import { describe, expect, it } from "vitest";
import { formatCurrency, formatRelativeToToday, getInitials } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats a whole-dollar USD amount without decimals", () => {
    expect(formatCurrency(512000, "USD")).toBe("$512,000");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Maria Chen")).toBe("MC");
  });

  it("handles a single-word name", () => {
    expect(getInitials("Cher")).toBe("C");
  });
});

/** Builds a local "YYYY-MM-DD" string — unlike toISOString(), this matches what formatRelativeToToday expects regardless of the runner's timezone. */
function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("formatRelativeToToday", () => {
  it("labels today's date as 'Today'", () => {
    expect(formatRelativeToToday(toLocalIsoDate(new Date()))).toBe("Today");
  });

  it("labels tomorrow's date as 'Tomorrow'", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatRelativeToToday(toLocalIsoDate(tomorrow))).toBe("Tomorrow");
  });
});
