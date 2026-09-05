import { supabaseServer } from "./supabase-server";

const BUCKET = "whatsapp-media";

function extensionFor(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export async function uploadMedia(
  buffer: Buffer,
  mimeType: string,
  whatsappMsgId: string
): Promise<string> {
  const safeId = whatsappMsgId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${safeId}.${extensionFor(mimeType)}`;

  const { error } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw error;
  return path;
}

export async function getMediaSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseServer.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) return null;
  return data.signedUrl;
}
