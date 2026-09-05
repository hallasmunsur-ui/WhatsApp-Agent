"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ConversationWithLastMessage } from "@/lib/types";

interface BroadcastResult {
  phone: string;
  success: boolean;
  error?: string;
}

export default function BroadcastsPage() {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [message, setMessage] = useState("");
  const [extraPhonesText, setExtraPhonesText] = useState("");
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<{ sent: number; failed: number; results: BroadcastResult[] } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
      setLoading(false);
    }
    void load();
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      for (const tag of c.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [conversations]);

  const existingPhones = useMemo(
    () => new Set(conversations.map((c) => c.phone.replace(/\D/g, ""))),
    [conversations]
  );

  const extraPhones = useMemo(
    () =>
      extraPhonesText
        .split(/[\n,]/)
        .map((p) => p.replace(/\D/g, ""))
        .filter((p) => p.length > 0),
    [extraPhonesText]
  );

  const validExtraPhones = extraPhones.filter((p) => p.length >= 10);
  const invalidExtraPhoneCount = extraPhones.length - validExtraPhones.length;
  const newExtraCount = validExtraPhones.filter((p) => !existingPhones.has(p)).length;

  const baseCount = selectedTag ? tagCounts.get(selectedTag) ?? 0 : conversations.length;
  const recipientCount = baseCount + newExtraCount;

  async function handleSend() {
    if (!message.trim() || sending) return;
    if (!confirm(`${recipientCount} জনকে মেসেজ পাঠাতে চান?`)) return;

    setSending(true);
    setSummary(null);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: selectedTag || null, message, extraPhones: validExtraPhones }),
      });
      const data = await res.json();
      setSummary(data);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white dark:bg-emerald-900 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            ←
          </Link>
          <h1 className="text-base font-semibold">Broadcasts</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

      {loading ? (
        <p className="text-sm text-neutral-500">লোড হচ্ছে…</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            কাদের পাঠাবেন
          </label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="mb-4 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">সবাইকে ({conversations.length} জন)</option>
            {[...tagCounts.entries()].map(([tag, count]) => (
              <option key={tag} value={tag}>
                শুধু &quot;{tag}&quot; ট্যাগ ({count} জন)
              </option>
            ))}
          </select>

          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            নতুন নাম্বার যোগ করুন (ঐচ্ছিক)
          </label>
          <textarea
            value={extraPhonesText}
            onChange={(e) => setExtraPhonesText(e.target.value)}
            placeholder={"যাদের সাথে আগে কথা হয়নি এমন নাম্বারেও পাঠাতে পারবেন।\nএকটি লাইনে একটি নাম্বার, দেশের কোডসহ, যেমন:\n8801311804882\n8801XXXXXXXXX"}
            rows={3}
            className="mb-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <p className="mb-4 text-xs text-neutral-500">
            {validExtraPhones.length > 0 &&
              `${validExtraPhones.length}টা নাম্বার শনাক্ত হয়েছে (${newExtraCount}টা নতুন)। `}
            {invalidExtraPhoneCount > 0 &&
              `${invalidExtraPhoneCount}টা নাম্বার সঠিক মনে হচ্ছে না — দেশের কোডসহ পুরো নাম্বার দিন।`}
          </p>

          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            বার্তা
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="যেমন: আমাদের নতুন IELTS Batch 54 শুরু হচ্ছে ১ অক্টোবর, ৮০% ছাড়ে মাত্র ৳২,০০০-এ।"
            rows={4}
            className="mb-4 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />

          <p className="mb-3 text-xs text-neutral-500">
            মোট প্রাপক: {recipientCount} জন — এটা একটা approved WhatsApp template দিয়ে পাঠানো হবে।
          </p>

          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || recipientCount === 0}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {sending ? "পাঠানো হচ্ছে…" : "পাঠান"}
          </button>

          {summary && (
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="font-medium text-neutral-800 dark:text-neutral-200">
                সফল: {summary.sent} জন, ব্যর্থ: {summary.failed} জন
              </p>
              {summary.failed > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
                  {summary.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <li key={r.phone}>
                        {r.phone}: {r.error}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
