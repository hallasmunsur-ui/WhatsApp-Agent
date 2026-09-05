import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const mode = body?.mode;

  if (mode !== "agent" && mode !== "human") {
    return NextResponse.json(
      { error: "mode must be 'agent' or 'human'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("conversations")
    .update({ mode })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
