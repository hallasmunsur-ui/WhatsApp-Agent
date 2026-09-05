"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    void check();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="px-4 py-2.5 text-xs leading-snug text-neutral-400 dark:text-neutral-500">
        নোটিফিকেশন এই ব্রাউজারে সাপোর্ট করে না। iPhone-এ প্রথমে Share বাটন দিয়ে
        &quot;Add to Home Screen&quot; করুন, তারপর হোম স্ক্রিনের আইকন থেকে খুলে আবার চেষ্টা করুন।
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="px-4 py-2.5 text-xs leading-snug text-red-500 dark:text-red-400">
        নোটিফিকেশন পারমিশন বন্ধ করা আছে। ফোনের Settings থেকে এই অ্যাপের জন্য নোটিফিকেশন চালু করুন।
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-500 dark:text-neutral-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        নোটিফিকেশন চালু আছে
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500 dark:text-neutral-400">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? "চালু হচ্ছে…" : "নোটিফিকেশন চালু করুন"}
    </button>
  );
}
