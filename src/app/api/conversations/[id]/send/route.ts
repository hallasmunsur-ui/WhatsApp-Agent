import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const content = (body?.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data: conversation, error: convError } = await supabaseServer
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  await sendWhatsAppMessage(conversation.phone, content);

  const { data: message, error } = await supabaseServer
    .from("messages")
    .insert({ conversation_id: id, role: "assistant", content })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json(message);
}
