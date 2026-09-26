export interface RenovaChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface RenovaChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  intent: string | null;
  referenced_case_id: string | null;
  created_at: string;
}

export interface RenovaChatTurn {
  conversation: RenovaChatConversation;
  user_message: RenovaChatMessage;
  assistant_message: RenovaChatMessage;
}
