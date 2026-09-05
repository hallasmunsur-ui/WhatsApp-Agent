import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const question = body?.question?.trim();
  const answer = body?.answer?.trim();

  if (!question && !answer) {
    return NextResponse.json(
      { error: "question or answer is required" },
      { status: 400 }
    );
  }

  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (question) update.question = question;
  if (answer) update.answer = answer;

  const { data, error } = await supabaseServer
    .from("knowledge_base")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseServer.from("knowledge_base").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
