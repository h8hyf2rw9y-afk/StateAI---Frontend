import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationList } from "@/components/layout/notification-list";
import type { Notification } from "@/features/notifications/types";

vi.mock("@/components/ui/dropdown-menu", () => import("@/tests/test-utils/dropdown-menu-stub"));

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

describe("NotificationList", () => {
  it("shows a loading state", () => {
    render(<NotificationList status="loading" notifications={[]} errorMessage={null} onMarkRead={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows a friendly error message, never a raw error detail", () => {
    render(
      <NotificationList status="error" notifications={[]} errorMessage="Your session has expired. Please sign in again." onMarkRead={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("shows an empty state when there is nothing to show", () => {
    render(<NotificationList status="success" notifications={[]} errorMessage={null} onMarkRead={vi.fn()} />);
    expect(screen.getByText(/nothing needs your attention/i)).toBeInTheDocument();
  });

  it("renders real notification content, never a raw related_entity_id", () => {
    render(
      <NotificationList status="success" notifications={[makeNotification()]} errorMessage={null} onMarkRead={vi.fn()} />
    );

    expect(screen.getByText("Follow up with Beatriz QA is overdue")).toBeInTheDocument();
    expect(screen.getByText("Was due Sep 9, 2026.")).toBeInTheDocument();
    expect(screen.getByText("Task overdue")).toBeInTheDocument(); // the formatted type label
    expect(screen.queryByText("t1")).not.toBeInTheDocument();
  });

  it("distinguishes read from unread notifications visually", () => {
    render(
      <NotificationList
        status="success"
        notifications={[makeNotification({ id: "unread", title: "Unread one" }), makeNotification({ id: "read", title: "Read one", read_at: "2026-09-10T01:00:00Z" })]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    expect(screen.getByText("Unread one")).toHaveClass("font-medium");
    expect(screen.getByText("Read one")).toHaveClass("text-muted-foreground");
  });

  it("calls onMarkRead when a notification is clicked", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationList status="success" notifications={[makeNotification()]} errorMessage={null} onMarkRead={onMarkRead} />
    );

    fireEvent.click(screen.getByText("Follow up with Beatriz QA is overdue"));
    expect(onMarkRead).toHaveBeenCalledWith(expect.objectContaining({ id: "n1" }));
  });

  it("links a task notification to the real Tasks page, never a fabricated detail route", () => {
    render(
      <NotificationList status="success" notifications={[makeNotification()]} errorMessage={null} onMarkRead={vi.fn()} />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/tasks");
  });

  it("renders a notification with no linkable related entity as plain, unclickable-as-a-link text", () => {
    render(
      <NotificationList
        status="success"
        notifications={[makeNotification({ related_entity_type: null, related_entity_id: null })]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Follow up with Beatriz QA is overdue")).toBeInTheDocument();
  });
});
