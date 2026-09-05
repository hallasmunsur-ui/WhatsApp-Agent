import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getMediaSignedUrl } from "@/lib/storage";
import type { Message } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = await Promise.all(
    ((data ?? []) as (Message & { media_path: string | null })[]).map(async (message) => ({
      ...message,
      media_url: message.media_path ? await getMediaSignedUrl(message.media_path) : null,
    }))
  );

  return NextResponse.json(messages);
}
