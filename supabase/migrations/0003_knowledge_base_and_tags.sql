create table knowledge_base (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table conversations add column tags text[] not null default '{}';
