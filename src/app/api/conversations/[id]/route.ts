import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const mode = body?.mode;
  const tags = body?.tags;

  if (mode !== undefined && mode !== "agent" && mode !== "human") {
    return NextResponse.json(
      { error: "mode must be 'agent' or 'human'" },
      { status: 400 }
    );
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return NextResponse.json({ error: "tags must be an array" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (mode !== undefined) update.mode = mode;
  if (tags !== undefined) update.tags = tags;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "mode or tags is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("conversations")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
