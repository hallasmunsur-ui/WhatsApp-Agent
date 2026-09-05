import OpenAI from "openai";
import type { Message } from "./types";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const SYSTEM_PROMPT =
  "You are a helpful assistant replying to customers over WhatsApp. Keep replies concise and friendly.";

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
