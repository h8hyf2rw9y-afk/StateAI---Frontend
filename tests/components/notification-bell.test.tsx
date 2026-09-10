import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { Notification } from "@/features/notifications/types";

vi.mock("@/components/ui/dropdown-menu", () => import("@/tests/test-utils/dropdown-menu-stub"));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/buyer-requirements", () => ({ getBuyerRequirement: vi.fn() }));

const getNotificationsMock = vi.fn();
const markNotificationReadMock = vi.fn();

vi.mock("@/lib/api/notifications", () => ({
  getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
}));

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    organization_id: "org-1",
    user_id: "user-1",
    type: "task_due",
    title: "Follow up with Beatriz QA is overdue",
    body: "Was due Sep 9, 2026.",
    related_entity_type: "task",
    related_entity_id: "t1",
    read_at: null,
    created_at: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches real notifications on mount and shows an unread count badge", async () => {
    getNotificationsMock.mockResolvedValue({ ok: true, data: [makeNotification(), makeNotification({ id: "n2" })] });

    render(<NotificationBell />);

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
  });

  it("shows no badge when there are no unread notifications", async () => {
    getNotificationsMock.mockResolvedValue({ ok: true, data: [makeNotification({ read_at: "2026-09-10T00:00:00Z" })] });

    render(<NotificationBell />);
    await waitFor(() => expect(getNotificationsMock).toHaveBeenCalled());

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("caps the visible badge count at 9+", async () => {
    getNotificationsMock.mockResolvedValue({
      ok: true,
      data: Array.from({ length: 12 }, (_, i) => makeNotification({ id: `n${i}` })),
    });

    render(<NotificationBell />);

    expect(await screen.findByText("9+")).toBeInTheDocument();
  });

  it("never sends an organization_id — only limit is passed to the API layer", async () => {
    getNotificationsMock.mockResolvedValue({ ok: true, data: [] });

    render(<NotificationBell />);
    await waitFor(() => expect(getNotificationsMock).toHaveBeenCalled());

    expect(getNotificationsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: expect.anything() })
    );
  });

  it("does not crash when the notifications request fails", async () => {
    getNotificationsMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });

    render(<NotificationBell />);
    await waitFor(() => expect(getNotificationsMock).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
  });
});
