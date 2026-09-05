import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { findOrCreateConversation } from "@/lib/conversations";
import type { Conversation } from "@/lib/types";

export const maxDuration = 60;

const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "general_update";
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "bn";

// How many messages to send in parallel — keeps the request fast for a
// realistic contact-list size without hammering the Graph API.
const CONCURRENCY = 5;

interface BroadcastResult {
  phone: string;
  success: boolean;
  error?: string;
}

// WhatsApp phone numbers are stored as country-code-prefixed digits only
// (e.g. "8801311804882") — strip anything else a person might paste in
// (spaces, dashes, a leading "+").
function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tag: string | null = body?.tag || null;
  const message: string = (body?.message ?? "").trim();
  const extraPhonesRaw: unknown = body?.extraPhones;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let query = supabaseServer.from("conversations").select("*");
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: conversations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recipientsByPhone = new Map<string, Conversation>();
  for (const c of conversations ?? []) {
    recipientsByPhone.set(c.phone, c);
  }

  const extraPhones = Array.isArray(extraPhonesRaw)
    ? [...new Set(extraPhonesRaw.map((p) => normalizePhone(String(p))).filter((p) => p.length >= 10))]
    : [];

  for (const phone of extraPhones) {
    if (recipientsByPhone.has(phone)) continue;
    const conversation = await findOrCreateConversation(phone, null);
    recipientsByPhone.set(phone, conversation);
  }

  const recipients = [...recipientsByPhone.values()];
  const results: BroadcastResult[] = [];

  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (conversation) => {
        try {
          await sendWhatsAppTemplateMessage(
            conversation.phone,
            TEMPLATE_NAME,
            TEMPLATE_LANG,
            [conversation.name || "there", message]
          );

          await supabaseServer.from("messages").insert({
            conversation_id: conversation.id,
            role: "assistant",
            content: message,
          });

          await supabaseServer
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversation.id);

          return { phone: conversation.phone, success: true };
        } catch (err) {
          return {
            phone: conversation.phone,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );
    results.push(...batchResults);
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  return NextResponse.json({ sent, failed: failed.length, results });
}
