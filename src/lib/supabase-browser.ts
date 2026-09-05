import { createClient } from "@supabase/supabase-js";

// Client-side client using the anon key — used by the dashboard for
// realtime subscriptions and reads.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
