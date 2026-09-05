import { supabaseServer } from "./supabase-server";
import type { Conversation } from "./types";

export async function findOrCreateConversation(
  phone: string,
  name: string | null
): Promise<Conversation> {
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
