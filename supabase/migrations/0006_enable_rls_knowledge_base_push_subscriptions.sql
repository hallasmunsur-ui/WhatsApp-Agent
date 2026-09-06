-- knowledge_base and push_subscriptions had RLS disabled, which combined
-- with Supabase's default anon/authenticated grants meant the public
-- anon key (baked into the client bundle, publicly visible) could read,
-- modify, or delete these tables directly via the REST API — bypassing the
-- app entirely. Both tables are only ever accessed server-side via the
-- service_role key (which always bypasses RLS), so enabling RLS with no
-- policies here is a pure lockdown with no effect on app functionality —
-- the same safe pattern already used on conversations/messages.
alter table knowledge_base enable row level security;
alter table push_subscriptions enable row level security;
