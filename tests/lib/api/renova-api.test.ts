import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRenovaCase, getRenovaCase, getRenovaCases, getRenovaHistory, updateRenovaCase } from "@/lib/api/renova";
import { getContacts } from "@/lib/api/contacts";

const apiRequestMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("Renova API client", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("lists cases from /renova/cases — never from the contacts endpoint", async () => {
    await getRenovaCases();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/v1/renova/cases", expect.any(Object));
    expect(apiRequestMock.mock.calls[0][0]).not.toContain("contacts");
  });

  it("sends only the filters that are set, and trims the search term", async () => {
    await getRenovaCases({ q: "  lópez  ", status: "offer_sent", assigned_user_id: "user-1" });

    expect(apiRequestMock.mock.calls[0][1].params).toEqual({
      limit: 200,
      q: "lópez",
      status: "offer_sent",
      assigned_user_id: "user-1",
    });
  });

  it("omits empty filters instead of sending blank values", async () => {
    await getRenovaCases({ q: "   ", status: "", assigned_user_id: undefined });

    expect(apiRequestMock.mock.calls[0][1].params).toEqual({
      limit: 200,
      q: undefined,
      status: undefined,
      assigned_user_id: undefined,
    });
  });

  it("gets, creates and updates a case with the right verbs and paths, no organization_id", async () => {
    await getRenovaCase("abc");
    await createRenovaCase({ owner_name: "María", owner_phone: "1", entry_date: "2026-09-20", assigned_user_id: "u" });
    await updateRenovaCase("abc", { notes: "x" });

    expect(apiRequestMock.mock.calls[0]).toEqual(["/api/v1/renova/cases/abc"]);
    expect(apiRequestMock.mock.calls[1][0]).toBe("/api/v1/renova/cases");
    expect(apiRequestMock.mock.calls[1][1].method).toBe("POST");
    expect(apiRequestMock.mock.calls[2][0]).toBe("/api/v1/renova/cases/abc");
    expect(apiRequestMock.mock.calls[2][1].method).toBe("PATCH");
    for (const call of apiRequestMock.mock.calls.slice(1)) {
      expect(JSON.stringify(call[1].body)).not.toContain("organization_id");
    }
  });

  it("reads a case's history from the audit log endpoint and keeps ONLY action and date — never the before/after data", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "h1",
          action: "RENOVA_CASE_UPDATED",
          created_at: "2026-09-21T15:30:00Z",
          entity_type: "renova_case",
          before_data: { final_offer: "1" },
          after_data: { final_offer: "2", has_nss: true },
          actor_user_id: "u",
          organization_id: "o",
        },
      ],
    });

    const result = await getRenovaHistory("abc");

    expect(apiRequestMock).toHaveBeenCalledWith("/api/v1/audit-logs", {
      params: { entity_type: "renova_case", entity_id: "abc", limit: 50 },
    });
    expect(result).toEqual({ ok: true, data: [{ id: "h1", action: "RENOVA_CASE_UPDATED", created_at: "2026-09-21T15:30:00Z" }] });
    expect(JSON.stringify(result)).not.toMatch(/before_data|after_data|has_nss|actor|organization/);
  });

  it("passes a history failure through untouched", async () => {
    apiRequestMock.mockResolvedValue({ ok: false, error: { message: "x", status: 500 } });

    expect(await getRenovaHistory("abc")).toEqual({ ok: false, error: { message: "x", status: 500 } });
  });

  it("exposes no delete", async () => {
    const mod = await import("@/lib/api/renova");
    expect(Object.keys(mod).some((k) => /delete|remove/i.test(k))).toBe(false);
  });
});

describe("Contacts API client — active filter", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("without arguments requests every contact (active param absent) — existing behavior", async () => {
    await getContacts();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/v1/contacts", { params: { limit: 200, active: undefined } });
  });

  it("with { active: true } asks the backend for active clients", async () => {
    await getContacts({ active: true });

    expect(apiRequestMock).toHaveBeenCalledWith("/api/v1/contacts", { params: { limit: 200, active: true } });
  });
});
