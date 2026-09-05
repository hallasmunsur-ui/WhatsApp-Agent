import { NextRequest, NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Best-effort in-memory brute-force guard, keyed by IP. Resets on cold
// start, but meaningfully slows down a scripted attacker within a warm
// instance's lifetime — a short numeric password has little protection
// otherwise.
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const record = attempts.get(ip);
  const now = Date.now();

  if (record && record.lockedUntil > now) {
    const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return NextResponse.json(
      { error: `অনেকবার ভুল চেষ্টা হয়েছে। ${waitMinutes} মিনিট পর আবার চেষ্টা করুন।` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const password = body?.password ?? "";

  if (!process.env.DASHBOARD_PASSWORD || !process.env.DASHBOARD_SESSION_TOKEN) {
    return NextResponse.json(
      { error: "Dashboard login is not configured" },
      { status: 500 }
    );
  }

  if (password !== process.env.DASHBOARD_PASSWORD) {
    const count = (record?.count ?? 0) + 1;
    attempts.set(ip, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });
    return NextResponse.json({ error: "ভুল পাসওয়ার্ড" }, { status: 401 });
  }

  attempts.delete(ip);

  const res = NextResponse.json({ status: "ok" });
  res.cookies.set("session", process.env.DASHBOARD_SESSION_TOKEN, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
