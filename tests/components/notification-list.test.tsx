import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationList } from "@/components/layout/notification-list";
import type { Notification } from "@/features/notifications/types";

vi.mock("@/components/ui/dropdown-menu", () => import("@/tests/test-utils/dropdown-menu-stub"));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const getBuyerRequirementMock = vi.fn();
vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirement: (...args: unknown[]) => getBuyerRequirementMock(...args),
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

describe("NotificationList", () => {
  beforeEach(() => {
    pushMock.mockClear();
    getBuyerRequirementMock.mockReset();
  });

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

  it("renders a Phase 7 followup_task_created notification with a real label and links to Tasks — no raw UUID", () => {
    const taskId = "b6a0f2a1-6a3e-4b5a-9a2f-3f1a2b3c4d5e";
    render(
      <NotificationList
        status="success"
        notifications={[
          makeNotification({
            type: "followup_task_created",
            title: "A follow-up task was created for Client B",
            body: "A follow-up task was created for the completed showing with Client B. Review the showing outcome and follow up with the client.",
            related_entity_type: "task",
            related_entity_id: taskId,
          }),
        ]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    expect(screen.getByText("A follow-up task was created for Client B")).toBeInTheDocument();
    expect(screen.getByText("Follow-up task created")).toBeInTheDocument(); // the formatted type label
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tasks");
    expect(screen.queryByText(taskId)).not.toBeInTheDocument();
  });

  it("links a contact notification (Phase 6) to the real lead detail page", () => {
    render(
      <NotificationList
        status="success"
        notifications={[
          makeNotification({
            type: "contact_missing_requirements",
            title: "Client B needs buyer requirements",
            body: "Client B doesn't have buyer requirements yet.",
            related_entity_type: "contact",
            related_entity_id: "c1",
          }),
        ]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    expect(screen.getByText("Client B needs buyer requirements")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/leads/c1");
  });

  it("has no plain <a href> for a buyer_requirement notification — no per-requirement detail page exists", () => {
    render(
      <NotificationList
        status="success"
        notifications={[
          makeNotification({
            type: "buyer_requirement_ready",
            title: "Client B's requirement is ready",
            body: "Client B's buyer requirement now has enough detail.",
            related_entity_type: "buyer_requirement",
            related_entity_id: "br1",
          }),
        ]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    expect(screen.getByText("Client B's requirement is ready")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("Phase 8: clicking a buyer_requirement notification resolves its owning Contact and navigates there — no raw UUID shown", async () => {
    getBuyerRequirementMock.mockResolvedValue({ ok: true, data: { id: "br1", contact_id: "c-owner-1" } });
    const onMarkRead = vi.fn();
    render(
      <NotificationList
        status="success"
        notifications={[
          makeNotification({
            type: "buyer_requirement_ready",
            title: "Client B's requirement is ready",
            body: "Client B's buyer requirement now has enough detail.",
            related_entity_type: "buyer_requirement",
            related_entity_id: "br1",
          }),
        ]}
        errorMessage={null}
        onMarkRead={onMarkRead}
      />
    );

    expect(screen.queryByText("br1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Client B's requirement is ready"));

    expect(onMarkRead).toHaveBeenCalledWith(expect.objectContaining({ id: "n1" }));
    await waitFor(() => expect(getBuyerRequirementMock).toHaveBeenCalledWith("br1"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/leads/c-owner-1"));
  });

  it("Phase 8: a buyer_requirement notification for a since-deleted requirement fails silently, never crashes", async () => {
    getBuyerRequirementMock.mockResolvedValue({ ok: false, error: { message: "Not found", status: 404 } });
    render(
      <NotificationList
        status="success"
        notifications={[
          makeNotification({
            type: "buyer_requirement_ready",
            related_entity_type: "buyer_requirement",
            related_entity_id: "br-deleted",
          }),
        ]}
        errorMessage={null}
        onMarkRead={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Follow up with Beatriz QA is overdue"));
    await waitFor(() => expect(getBuyerRequirementMock).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
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
