import webpush from "web-push";
import { supabaseServer } from "./supabase-server";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hallasmunsur@gmail.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Notifies every subscribed device — used sparingly (only when the AI can't
// answer and a human needs to step in), not for every incoming message.
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys are not configured — skipping push notification.");
    return;
  }

  const { data: subscriptions } = await supabaseServer.from("push_subscriptions").select("*");
  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is no longer valid (uninstalled, expired) — remove it.
          await supabaseServer.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Failed to send push notification:", err);
        }
      }
    })
  );
}
