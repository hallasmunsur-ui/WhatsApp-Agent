"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KbEntry {
  id: string;
  question: string;
  answer: string;
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/knowledge-base");
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, no data-fetching library in use
    void load();
  }, []);

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion, answer: newAnswer }),
      });
      setNewQuestion("");
      setNewAnswer("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: KbEntry) {
    setEditingId(entry.id);
    setEditQuestion(entry.question);
    setEditAnswer(entry.answer);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/knowledge-base/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: editQuestion, answer: editAnswer }),
    });
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("এই FAQ-টা মুছে ফেলতে চান?")) return;
    await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
    await load();
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
          <h1 className="text-base font-semibold">Knowledge Base</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          নতুন FAQ যোগ করুন
        </h2>
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="প্রশ্ন (Question)"
          rows={2}
          className="mb-2 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="উত্তর (Answer)"
          rows={3}
          className="mb-2 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          যোগ করুন
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">লোড হচ্ছে…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-neutral-500">এখনো কোনো FAQ যোগ করা হয়নি।</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              {editingId === entry.id ? (
                <>
                  <textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    rows={2}
                    className="mb-2 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={3}
                    className="mb-2 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(entry.id)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
                    >
                      সেভ করুন
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                    >
                      বাতিল
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {entry.question}
                  </p>
                  <p className="mb-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
                    {entry.answer}
                  </p>
                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
