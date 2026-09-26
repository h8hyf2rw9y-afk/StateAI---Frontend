import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  RenovaChatConversation,
  RenovaChatMessage,
  RenovaChatTurn,
} from "@/features/ai/renova-chat-types";

const RENOVA_CHAT_TIMEOUT_MS = 260_000;

export function getRenovaChatConversations(): Promise<ApiResult<RenovaChatConversation[]>> {
  return apiRequest("/api/v1/renova/chat/conversations", { cache: "no-store" });
}

export function createRenovaChatConversation(): Promise<ApiResult<RenovaChatConversation>> {
  return apiRequest("/api/v1/renova/chat/conversations", {
    method: "POST",
    body: {},
    cache: "no-store",
  });
}

export function getRenovaChatMessages(conversationId: string): Promise<ApiResult<RenovaChatMessage[]>> {
  return apiRequest(`/api/v1/renova/chat/conversations/${conversationId}/messages`, {
    cache: "no-store",
  });
}

export function askRenovaChat(
  conversationId: string,
  content: string
): Promise<ApiResult<RenovaChatTurn>> {
  return apiRequest(`/api/v1/renova/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
    cache: "no-store",
    timeoutMs: RENOVA_CHAT_TIMEOUT_MS,
  });
}
