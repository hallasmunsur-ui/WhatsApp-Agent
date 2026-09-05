import { supabaseServer } from "./supabase-server";

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export async function getKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
  const { data, error } = await supabaseServer
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
