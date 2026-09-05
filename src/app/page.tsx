"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import type {
  ConversationMode,
  ConversationWithLastMessage,
  Message,
} from "@/lib/types";

export default function DashboardPage() {
  const [conversations, setConversations] = useState<
    ConversationWithLastMessage[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await res.json();
    setMessages(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, no data-fetching library in use
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on selection change, no data-fetching library in use
      void loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  // Realtime: refresh conversation list on any change, and refresh the open
  // thread's messages when a new message arrives for it.
  useEffect(() => {
    const channel = supabaseBrowser
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          loadConversations();
          if (selectedId && payload.new.conversation_id === selectedId) {
            loadMessages(selectedId);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [selectedId, loadConversations, loadMessages]);

  async function handleModeChange(mode: ConversationMode) {
    if (!selectedId) return;
    await fetch(`/api/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    loadConversations();
  }

  async function handleSend(content: string) {
    if (!selectedId) return;
    await fetch(`/api/conversations/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    loadMessages(selectedId);
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {selectedConversation ? (
        <ChatPanel
          conversation={selectedConversation}
          messages={messages}
          onModeChange={handleModeChange}
          onSend={handleSend}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-neutral-400">
          Select a conversation to view messages
        </div>
      )}
    </div>
  );
}
