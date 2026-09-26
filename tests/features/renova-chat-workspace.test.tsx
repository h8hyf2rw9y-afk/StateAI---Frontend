import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaChatWorkspace } from "@/features/ai/components/renova-chat-workspace";

const listConversationsMock = vi.fn();
const createConversationMock = vi.fn();
const listMessagesMock = vi.fn();
const askMock = vi.fn();

vi.mock("@/lib/api/renova-chat", () => ({
  getRenovaChatConversations: () => listConversationsMock(),
  createRenovaChatConversation: () => createConversationMock(),
  getRenovaChatMessages: (id: string) => listMessagesMock(id),
  askRenovaChat: (id: string, content: string) => askMock(id, content),
}));

const conversation = {
  id: "conversation-1",
  title: "Nueva conversación",
  created_at: "2026-09-25T00:00:00Z",
  updated_at: "2026-09-25T00:00:00Z",
  last_message_at: "2026-09-25T00:00:00Z",
};

describe("RenovaChatWorkspace", () => {
  beforeEach(() => {
    listConversationsMock.mockReset();
    createConversationMock.mockReset();
    listMessagesMock.mockReset();
    askMock.mockReset();
    listConversationsMock.mockResolvedValue({ ok: true, data: [] });
    listMessagesMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("shows the bounded read-only capabilities", async () => {
    render(<RenovaChatWorkspace />);

    expect(await screen.findByText("Pregunta sobre tus leads de Renova")).toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.getByText("¿Cuántos leads activos tengo?")).toBeInTheDocument();
  });

  it("creates a conversation, sends a question and renders the persisted answer", async () => {
    createConversationMock.mockResolvedValue({ ok: true, data: conversation });
    askMock.mockResolvedValue({
      ok: true,
      data: {
        conversation: { ...conversation, title: "¿Cuántos leads activos tengo?" },
        user_message: {
          id: "message-user",
          conversation_id: conversation.id,
          role: "user",
          content: "¿Cuántos leads activos tengo?",
          intent: null,
          referenced_case_id: null,
          created_at: "2026-09-25T00:00:01Z",
        },
        assistant_message: {
          id: "message-assistant",
          conversation_id: conversation.id,
          role: "assistant",
          content: "Tienes 3 leads activos en Renova.",
          intent: "active_count",
          referenced_case_id: null,
          created_at: "2026-09-25T00:00:02Z",
        },
      },
    });
    render(<RenovaChatWorkspace />);
    const input = await screen.findByLabelText("Pregunta para Renova Assistant");
    fireEvent.change(input, { target: { value: "¿Cuántos leads activos tengo?" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pregunta" }));

    expect(await screen.findByText("Tienes 3 leads activos en Renova.")).toBeInTheDocument();
    expect(createConversationMock).toHaveBeenCalledTimes(1);
    expect(askMock).toHaveBeenCalledWith(conversation.id, "¿Cuántos leads activos tengo?");
    await waitFor(() => expect(screen.getAllByText("¿Cuántos leads activos tengo?")).toHaveLength(2));
  });
});
