"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { ConversationWithLastMessage } from "@/lib/types";

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function MoreMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Link
            href="/broadcasts"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Broadcasts
          </Link>
          <Link
            href="/knowledge-base"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Knowledge Base
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-50 dark:text-red-400 dark:hover:bg-neutral-800"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
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
  const router = useRouter();
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

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white dark:bg-emerald-900">
        <h1 className="text-base font-semibold">English Confidence Pro</h1>
        <MoreMenu onLogout={handleLogout} />
      </div>
      <div className="border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="নাম, ফোন নাম্বার বা ট্যাগ দিয়ে খুঁজুন…"
          className="w-full rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm outline-none focus:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-neutral-500">
            {conversations.length === 0
              ? "No conversations yet."
              : "কোনো ফলাফল পাওয়া যায়নি।"}
          </p>
        )}
        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const isHuman = conversation.mode === "human";
          const label = conversation.name || conversation.phone;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors dark:border-neutral-900 ${
                isActive
                  ? "bg-emerald-50 dark:bg-neutral-900"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              }`}
            >
              <Avatar label={label} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {label}
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
                  <div className="mt-1 flex flex-wrap gap-1">
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
