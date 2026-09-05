import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data: conversations, error } = await supabaseServer
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withLastMessage = await Promise.all(
    (conversations ?? []).map(async (conversation) => {
      const { data: lastMessage } = await supabaseServer
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { ...conversation, last_message: lastMessage ?? null };
    })
  );

  return NextResponse.json(withLastMessage);
}
