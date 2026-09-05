import OpenAI, { toFile } from "openai";
import type { Message } from "./types";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Optional: only used to transcribe incoming WhatsApp voice notes.
const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || "minimax/minimax-m3:free";

const SYSTEM_PROMPT =
  "You are a helpful assistant replying to customers over WhatsApp. Keep replies concise and friendly. " +
  "Some messages are prefixed with [Image] or [Voice message] followed by a description or transcript of " +
  "media the customer sent — respond naturally as if you saw or heard it directly.";

// Number of prior messages to include as conversation context.
const HISTORY_LIMIT = 20;

export async function generateReply(history: Message[]): Promise<string> {
  const recent = history.slice(-HISTORY_LIMIT);

  const completion = await openrouter.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...recent.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Sorry, I couldn't come up with a response."
  );
}

export async function describeImage(
  buffer: Buffer,
  mimeType: string,
  caption: string | null
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const instruction = caption
    ? `The sender attached this image with the caption: "${caption}". Describe what's in the image and transcribe any visible text, so a support agent can understand what they're asking about.`
    : "Describe what's in this image and transcribe any visible text (e.g. if it's a screenshot), so a support agent can understand what the sender is asking about.";

  const completion = await openrouter.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Image received, but it couldn't be processed."
  );
}

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured — cannot transcribe voice messages.");
  }

  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "mp3";
  const file = await toFile(buffer, `voice.${ext}`);

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
  });

  return transcription.text.trim();
}
