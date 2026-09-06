import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { downloadWhatsAppMedia, sendWhatsAppMessage } from "@/lib/whatsapp";
import { describeImage, generateReply, transcribeAudio } from "@/lib/ai";
import { uploadMedia } from "@/lib/storage";
import { findOrCreateConversation } from "@/lib/conversations";
import { sendPushToAll } from "@/lib/push";
import type { Message } from "@/lib/types";

const SUPPORTED_MESSAGE_TYPES = ["text", "image", "audio"];

interface WhatsAppTextMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string; voice?: boolean };
  button?: { text: string; payload?: string };
  interactive?: { button_reply?: { id: string; title: string } };
}

// Free-text keywords and marketing-template opt-out button replies that
// mean "stop sending me broadcasts" — checked before anything else so it
// works regardless of message type.
const OPT_OUT_KEYWORDS = new Set([
  "stop",
  "unsubscribe",
  "opt out",
  "optout",
  "remove me",
  "আর মেসেজ চাই না",
  "মেসেজ বন্ধ করুন",
  "বন্ধ করুন",
  "আনসাবস্ক্রাইব",
]);

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?।]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getOptOutText(waMessage: WhatsAppTextMessage): string | null {
  const text =
    waMessage.type === "text"
      ? waMessage.text?.body
      : waMessage.type === "button"
        ? waMessage.button?.text
        : waMessage.type === "interactive"
          ? waMessage.interactive?.button_reply?.title
          : undefined;

  if (!text || !OPT_OUT_KEYWORDS.has(normalizeForMatch(text))) return null;
  return text;
}

interface WhatsAppContact {
  profile?: { name?: string };
  wa_id: string;
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppTextMessage[];
        contacts?: WhatsAppContact[];
      };
    }>;
  }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Verifies Meta's X-Hub-Signature-256 header so only genuine WhatsApp
// webhook calls are processed. If WHATSAPP_APP_SECRET isn't set yet, this
// skips verification (with a warning) rather than breaking the live bot.
function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.warn("WHATSAPP_APP_SECRET is not set — skipping webhook signature verification.");
    return true;
  }

  if (!signatureHeader) return false;

  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const actualBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  return (
    actualBuf.length === expectedBuf.length && timingSafeEqual(actualBuf, expectedBuf)
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isValidSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload: WebhookPayload = JSON.parse(rawBody);

  try {
    await processWebhookPayload(payload);
  } catch (err) {
    // Log but still return 200 so Meta doesn't retry indefinitely.
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ status: "ok" });
}

async function processWebhookPayload(payload: WebhookPayload) {
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const incomingMessages = value?.messages;

      // Ignore status updates (delivered/read/etc.) — only handle messages.
      if (!incomingMessages || incomingMessages.length === 0) continue;

      const contact = value?.contacts?.[0];

      for (const waMessage of incomingMessages) {
        await handleIncomingMessage(waMessage, contact);
      }
    }
  }
}

interface ResolvedContent {
  content: string;
  mediaPath?: string;
  mediaType?: "image" | "audio";
}

async function resolveMessageContent(waMessage: WhatsAppTextMessage): Promise<ResolvedContent> {
  if (waMessage.type === "text") {
    return { content: waMessage.text?.body ?? "" };
  }

  if (waMessage.type === "image" && waMessage.image) {
    const { buffer, mimeType } = await downloadWhatsAppMedia(waMessage.image.id);
    const [description, mediaPath] = await Promise.all([
      describeImage(buffer, mimeType, waMessage.image.caption ?? null),
      uploadMedia(buffer, mimeType, waMessage.id),
    ]);
    return { content: `[Image] ${description}`, mediaPath, mediaType: "image" };
  }

  if (waMessage.type === "audio" && waMessage.audio) {
    const { buffer, mimeType } = await downloadWhatsAppMedia(waMessage.audio.id);
    const [transcript, mediaPath] = await Promise.all([
      transcribeAudio(buffer, mimeType),
      uploadMedia(buffer, mimeType, waMessage.id),
    ]);
    return { content: `[Voice message] ${transcript}`, mediaPath, mediaType: "audio" };
  }

  throw new Error(`Unhandled message type: ${waMessage.type}`);
}

const OPT_OUT_CONFIRMATION =
  "ঠিক আছে, আপনাকে আর কোনো broadcast/আপডেট মেসেজ পাঠানো হবে না। ধন্যবাদ।";

async function handleOptOut(
  waMessage: WhatsAppTextMessage,
  contact: WhatsAppContact | undefined,
  optOutText: string
) {
  const phone = waMessage.from;
  const name = contact?.profile?.name ?? null;
  const conversation = await findOrCreateConversation(phone, name);

  const { error: insertError } = await supabaseServer.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: optOutText,
    whatsapp_msg_id: waMessage.id,
  });

  // Unique constraint violation means Meta retried a message we already
  // stored — ignore and stop, since we've already processed it.
  if (insertError) {
    if (insertError.code === "23505") return;
    throw insertError;
  }

  await supabaseServer
    .from("conversations")
    .update({ opted_out: true, updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  await sendWhatsAppMessage(phone, OPT_OUT_CONFIRMATION);

  await supabaseServer.from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: OPT_OUT_CONFIRMATION,
  });
}

async function handleIncomingMessage(
  waMessage: WhatsAppTextMessage,
  contact: WhatsAppContact | undefined
) {
  const optOutText = getOptOutText(waMessage);
  if (optOutText) {
    await handleOptOut(waMessage, contact, optOutText);
    return;
  }

  if (!SUPPORTED_MESSAGE_TYPES.includes(waMessage.type)) return;

  const phone = waMessage.from;
  const whatsappMsgId = waMessage.id;
  const name = contact?.profile?.name ?? null;

  let resolved: ResolvedContent;
  try {
    resolved = await resolveMessageContent(waMessage);
  } catch (err) {
    console.error("Failed to process incoming media:", err);
    resolved = {
      content:
        waMessage.type === "audio"
          ? "[Voice message could not be transcribed]"
          : "[Image could not be processed]",
    };
  }

  const conversation = await findOrCreateConversation(phone, name);

  const { error: insertError } = await supabaseServer.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: resolved.content,
    whatsapp_msg_id: whatsappMsgId,
    media_path: resolved.mediaPath ?? null,
    media_type: resolved.mediaType ?? null,
  });

  // Unique constraint violation means Meta retried a message we already
  // stored — ignore and stop, since we've already responded to it.
  if (insertError) {
    if (insertError.code === "23505") return;
    throw insertError;
  }

  await supabaseServer
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (conversation.mode !== "agent") {
    // Human mode: store only, a person replies from the dashboard.
    return;
  }

  const { data: history } = await supabaseServer
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  const replyText = await generateReply((history ?? []) as Message[]);

  if (!replyText) {
    // The assistant has no reliable answer — leave it for a human to reply,
    // and let the founder know so they can jump in.
    await sendPushToAll({
      title: name || phone,
      body: resolved.content.slice(0, 150),
      url: `/?conversation=${conversation.id}`,
    });
    return;
  }

  await sendWhatsAppMessage(phone, replyText);

  await supabaseServer.from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: replyText,
  });

  await supabaseServer
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);
}
