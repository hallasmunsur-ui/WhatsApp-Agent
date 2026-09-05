export type ConversationMode = "agent" | "human";

export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  mode: ConversationMode;
  tags: string[];
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  whatsapp_msg_id: string | null;
  media_type: "image" | "audio" | null;
  media_url?: string | null;
  created_at: string;
}

export interface ConversationWithLastMessage extends Conversation {
  last_message: Message | null;
}
