"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConversationWithLastMessage } from "@/lib/types";

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationWithLastMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.phone.toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      c.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Conversations
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/broadcasts"
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Broadcasts
          </Link>
          <Link
            href="/knowledge-base"
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Knowledge Base
          </Link>
        </div>
      </div>
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="নাম, ফোন নাম্বার বা ট্যাগ দিয়ে খুঁজুন…"
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-500">
            {conversations.length === 0
              ? "No conversations yet."
              : "কোনো ফলাফল পাওয়া যায়নি।"}
          </p>
        )}
        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const isHuman = conversation.mode === "human";

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full flex-col gap-1 border-b border-neutral-100 px-4 py-3 text-left transition-colors dark:border-neutral-900 ${
                isActive
                  ? "bg-neutral-100 dark:bg-neutral-900"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {conversation.name || conversation.phone}
                </span>
                {conversation.last_message && (
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatTime(conversation.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-neutral-500">
                  {conversation.last_message?.content || "No messages yet"}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    isHuman
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  }`}
                >
                  {conversation.mode}
                </span>
              </div>
              {conversation.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {conversation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
