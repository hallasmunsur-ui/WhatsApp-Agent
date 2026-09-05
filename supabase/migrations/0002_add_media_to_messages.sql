alter table messages add column media_path text;
alter table messages add column media_type text check (media_type in ('image', 'audio'));

insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', false)
on conflict (id) do nothing;
