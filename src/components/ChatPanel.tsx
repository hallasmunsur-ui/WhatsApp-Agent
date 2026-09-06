"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Conversation, ConversationMode, Message } from "@/lib/types";

export function ChatPanel({
  conversation,
  messages,
  onModeChange,
  onTagsChange,
  onOptedOutChange,
  onSend,
  onBack,
}: {
  conversation: Conversation;
  messages: Message[];
  onModeChange: (mode: ConversationMode) => void;
  onTagsChange: (tags: string[]) => void;
  onOptedOutChange: (optedOut: boolean) => void;
  onSend: (content: string) => Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function addTag() {
    const tag = tagDraft.trim();
    if (tag && !conversation.tags.includes(tag)) {
      onTagsChange([...conversation.tags, tag]);
    }
    setTagDraft("");
    setShowTagInput(false);
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
  const label = conversation.name || conversation.phone;

  return (
    <div className="flex h-full w-full flex-col bg-[#f3f3f1] dark:bg-neutral-900">
      <div className="border-b border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 md:hidden"
          >
            ←
          </button>
          <Avatar label={label} size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
              {label}
            </h2>
            <p className="truncate text-sm text-neutral-500">{conversation.phone}</p>
          </div>
          <button
            onClick={() => onModeChange(isHuman ? "agent" : "human")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide ${
              isHuman
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            }`}
          >
            {conversation.mode}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
          {conversation.opted_out && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Broadcast opt-out
              <button
                onClick={() => onOptedOutChange(false)}
                className="text-red-500 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-100"
              >
                পুনরায় চালু করুন
              </button>
            </span>
          )}
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
          {showTagInput ? (
            <input
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={addTag}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="tag name"
              className="w-24 rounded-full border border-neutral-300 bg-transparent px-2.5 py-1 text-xs outline-none focus:border-neutral-400 dark:border-neutral-700"
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400"
            >
              + tag
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-md sm:px-4 ${
                  isUser
                    ? "bg-white text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "bg-emerald-600 text-white"
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
                  <audio controls src={message.media_url} className="mb-2 w-64 max-w-full" />
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div
                  className={`mt-1 text-[10px] ${
                    isUser ? "text-neutral-400" : "text-emerald-100"
                  }`}
                >
                  {isUser ? label : "AI"} ·{" "}
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

      <div className="flex items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950 sm:px-4 sm:py-3">
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
          className="shrink-0 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
