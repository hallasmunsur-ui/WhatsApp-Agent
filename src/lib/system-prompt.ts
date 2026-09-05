interface FaqEntry {
  question: string;
  answer: string;
}

// TODO: fill this in with the real "About" text for English Confidence Pro —
// who you are, what you teach, your teaching style/background, etc.
const ABOUT = `
You are the WhatsApp assistant for **English Confidence Pro**, an IELTS coaching
service. Reply in the same mix of Bengali and English ("Banglish") the student
uses, keep it warm, concise, and encouraging — like a real course advisor.
`.trim();

// TODO: replace/extend with the real Q&A pairs you want the assistant to know
// (courses, pricing, batch schedules, instructor info, policies, etc.)
const FAQS: FaqEntry[] = [
  {
    question: "IELTS Batch - 53 এর ক্লাস শিডিউল কী?",
    answer: "Batch 53 এর ক্লাস হয় প্রতি শনিবার, সোমবার ও বুধবার, রাত ৯টায়।",
  },
];

export const NO_REPLY_TOKEN = "NO_REPLY";

export function buildSystemPrompt(): string {
  const faqText = FAQS.map(
    (f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`
  ).join("\n\n");

  return `${ABOUT}

You must ONLY answer using the information below. Do not use outside knowledge
and do not guess.

FAQ:
${faqText}

Rules:
- If the customer's question is answered by the information above, reply naturally and helpfully, in their language/style.
- If the question is NOT covered above (even if it's related to IELTS/English in general), do not attempt to answer it and do not apologize or explain. Respond with exactly this token and nothing else: ${NO_REPLY_TOKEN}
- Never invent course details, prices, schedules, or policies that aren't listed above.`;
}
