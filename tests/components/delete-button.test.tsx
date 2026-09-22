import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeleteButton } from "@/components/ui/delete-button";

describe("DeleteButton", () => {
  it("does not delete on the first click — it opens confirm/cancel instead", () => {
    const onConfirm = vi.fn();
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm only after the confirm circle is clicked, and reports success", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Deleted"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument());
  });

  it("cancelling calls onCancel and never onConfirm", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    // AnimatePresence plays an exit transition before unmounting the panel.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument());
  });

  it("Escape while open cancels instead of deleting", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    const container = screen.getByRole("button", { name: "Confirm delete" }).closest("[data-slot=delete-button]")!;
    fireEvent.keyDown(container, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows a busy state while an async onConfirm is in flight and disables the trigger", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(screen.getByRole("status")).toHaveTextContent("Deleting…");
    expect(screen.getByRole("button", { name: "Delete thing" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete thing" })).toHaveAttribute("aria-busy", "true");

    resolve();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Deleted"));
  });

  it("a rejected onConfirm never shows the deleted state and reports the error", async () => {
    const failure = new Error("Forbidden");
    const onConfirm = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(screen.getByRole("status")).not.toHaveTextContent("Deleted");
    expect(screen.getByRole("button", { name: "Delete thing" })).toBeEnabled();
    // Back to the closed bin — the person can retry.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument());
  });

  it("without onConfirm, confirming still reaches the deleted state (fire-and-forget usage)", async () => {
    render(<DeleteButton label="Delete thing" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Deleted"));
  });

  it("an externally disabled button cannot be opened", () => {
    const onConfirm = vi.fn();
    render(<DeleteButton label="Delete thing" onConfirm={onConfirm} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));

    expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument();
  });

  it("uses the custom labels when given", () => {
    render(<DeleteButton label="Remove item" confirmLabel="Yes, remove it" cancelLabel="Keep it" onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));

    expect(screen.getByRole("button", { name: "Yes, remove it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });
});
