import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { downloadWhatsAppMedia, sendWhatsAppMessage } from "@/lib/whatsapp";
import { describeImage, generateReply, transcribeAudio } from "@/lib/ai";
import type { Message } from "@/lib/types";

const SUPPORTED_MESSAGE_TYPES = ["text", "image", "audio"];

interface WhatsAppTextMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string; voice?: boolean };
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

export async function POST(req: NextRequest) {
  const payload: WebhookPayload = await req.json();

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

async function resolveMessageContent(waMessage: WhatsAppTextMessage): Promise<string> {
  if (waMessage.type === "text") {
    return waMessage.text?.body ?? "";
  }

  if (waMessage.type === "image" && waMessage.image) {
    const { buffer, mimeType } = await downloadWhatsAppMedia(waMessage.image.id);
    const description = await describeImage(buffer, mimeType, waMessage.image.caption ?? null);
    return `[Image] ${description}`;
  }

  if (waMessage.type === "audio" && waMessage.audio) {
    const { buffer, mimeType } = await downloadWhatsAppMedia(waMessage.audio.id);
    const transcript = await transcribeAudio(buffer, mimeType);
    return `[Voice message] ${transcript}`;
  }

  throw new Error(`Unhandled message type: ${waMessage.type}`);
}

async function handleIncomingMessage(
  waMessage: WhatsAppTextMessage,
  contact: WhatsAppContact | undefined
) {
  if (!SUPPORTED_MESSAGE_TYPES.includes(waMessage.type)) return;

  const phone = waMessage.from;
  const whatsappMsgId = waMessage.id;
  const name = contact?.profile?.name ?? null;

  let content: string;
  try {
    content = await resolveMessageContent(waMessage);
  } catch (err) {
    console.error("Failed to process incoming media:", err);
    content =
      waMessage.type === "audio"
        ? "[Voice message could not be transcribed]"
        : "[Image could not be processed]";
  }

  const conversation = await findOrCreateConversation(phone, name);

  const { error: insertError } = await supabaseServer.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content,
    whatsapp_msg_id: whatsappMsgId,
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

async function findOrCreateConversation(phone: string, name: string | null) {
  const { data: existing } = await supabaseServer
    .from("conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabaseServer
    .from("conversations")
    .insert({ phone, name })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}
