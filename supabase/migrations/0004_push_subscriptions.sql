create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now()
);
