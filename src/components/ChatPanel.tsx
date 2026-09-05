"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation, ConversationMode, Message } from "@/lib/types";

export function ChatPanel({
  conversation,
  messages,
  onModeChange,
  onTagsChange,
  onSend,
}: {
  conversation: Conversation;
  messages: Message[];
  onModeChange: (mode: ConversationMode) => void;
  onTagsChange: (tags: string[]) => void;
  onSend: (content: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || conversation.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    onTagsChange([...conversation.tags, tag]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    onTagsChange(conversation.tags.filter((t) => t !== tag));
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await onSend(content);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  const isHuman = conversation.mode === "human";

  return (
    <div className="flex h-full flex-1 flex-col bg-neutral-50 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {conversation.name || conversation.phone}
            </h2>
            <p className="text-sm text-neutral-500">{conversation.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                isHuman
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              }`}
            >
              {conversation.mode}
            </span>
            <button
              onClick={() => onModeChange(isHuman ? "agent" : "human")}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Switch to {isHuman ? "Agent" : "Human"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {conversation.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="+ tag"
            className="w-20 rounded-full border border-dashed border-neutral-300 bg-transparent px-2.5 py-1 text-xs outline-none focus:border-neutral-400 dark:border-neutral-700"
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-md rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  isUser
                    ? "bg-white text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "bg-green-600 text-white"
                }`}
              >
                {message.media_type === "image" && message.media_url && (
                  <img
                    src={message.media_url}
                    alt="Attachment"
                    className="mb-2 max-h-64 rounded-lg"
                  />
                )}
                {message.media_type === "audio" && message.media_url && (
                  <audio controls src={message.media_url} className="mb-2 w-64" />
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div
                  className={`mt-1 text-[10px] ${
                    isUser ? "text-neutral-400" : "text-green-100"
                  }`}
                >
                  {isUser ? conversation.name || conversation.phone : "AI"} ·{" "}
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            isHuman ? "Reply as human agent…" : "Send a manual override message…"
          }
          className="flex-1 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
