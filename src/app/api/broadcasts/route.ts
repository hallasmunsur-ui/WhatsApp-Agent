import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tag: string | null = body?.tag || null;
  const message: string = (body?.message ?? "").trim();

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

  const recipients = conversations ?? [];
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
