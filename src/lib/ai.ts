import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import type { Message } from "./types";
import { buildSystemPrompt, NO_REPLY_TOKEN } from "./system-prompt";
import { getKnowledgeBase } from "./knowledge-base";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Optional: only used to transcribe incoming WhatsApp voice notes.
const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

const TEXT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || "claude-haiku-4-5-20251001";

// Number of prior messages to include as conversation context.
const HISTORY_LIMIT = 20;

// The model is instructed never to use emojis, but strip any that slip
// through as a safety net.
const EMOJI_REGEX =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}️‍]/gu;

function stripEmojis(text: string): string {
  return text
    .replace(EMOJI_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function textFromResponse(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// Returns null when the assistant has no reliable answer — the caller should
// skip sending anything and leave the message for a human to handle.
export async function generateReply(history: Message[]): Promise<string | null> {
  const recent = history.slice(-HISTORY_LIMIT);
  const faqs = await getKnowledgeBase();
  const isFirstMessage = !history.some((m) => m.role === "assistant");

  const messages: Anthropic.MessageParam[] = recent.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  if (messages.length === 0) return null;

  const completion = await anthropic.messages.create({
    model: TEXT_MODEL,
    max_tokens: 1024,
    system:
      buildSystemPrompt(faqs, isFirstMessage) +
      "\n\nSome messages are prefixed with [Image] or [Voice message] followed by a description or " +
      "transcript of media the customer sent — respond naturally as if you saw or heard it directly.",
    messages,
  });

  const reply = textFromResponse(completion.content);

  if (!reply || reply.includes(NO_REPLY_TOKEN)) {
    return null;
  }

  return stripEmojis(reply);
}

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

function toSupportedImageType(mimeType: string): SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
    ? (mimeType as SupportedImageType)
    : "image/jpeg";
}

export async function describeImage(
  buffer: Buffer,
  mimeType: string,
  caption: string | null
): Promise<string> {
  const instruction = caption
    ? `The sender attached this image with the caption: "${caption}". Describe what's in the image and transcribe any visible text, so a support agent can understand what they're asking about.`
    : "Describe what's in this image and transcribe any visible text (e.g. if it's a screenshot), so a support agent can understand what the sender is asking about.";

  const completion = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: toSupportedImageType(mimeType),
              data: buffer.toString("base64"),
            },
          },
          { type: "text", text: instruction },
        ],
      },
    ],
  });

  return textFromResponse(completion.content) || "Image received, but it couldn't be processed.";
}

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured — cannot transcribe voice messages.");
  }

  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "mp3";
  const file = await toFile(buffer, `voice.${ext}`);

  // The "turbo" variant frequently mis-transcribes lower-resource languages
  // like Bengali into the wrong script (e.g. Devanagari/Gujarati). The full
  // v3 model reliably picks the correct script.
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
  });

  return transcription.text.trim();
}
