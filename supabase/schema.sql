-- =====================================================================
-- Plush Squad backend (Supabase). Run ONCE in Dashboard -> SQL Editor -> Run.
-- Safe to run again: everything is "create if not exists" / "or replace".
-- Accounts are username + password (no real e-mails). Kids only ever see
-- friends they added by code. All access goes through Row Level Security.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,16}$'),
  code text unique not null,
  avatar jsonb not null default '{}'::jsonb,
  title text not null default 'Plush Friend',
  level int not null default 1,
  stars int not null default 0,
  stickers int not null default 0,
  wins int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  tries int not null default 0,
  last_try timestamptz
);
create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.toys (
  id text primary key,                       -- '<owner uuid>:<toy id>'
  owner uuid not null references auth.users(id) on delete cascade,
  meta jsonb not null,
  img text,
  created_at timestamptz not null default now()
);
create table if not exists public.friends (
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b)
);
create table if not exists public.inbox (
  id bigint generated always as identity primary key,
  to_user uuid not null references auth.users(id) on delete cascade,
  from_user uuid references auth.users(id) on delete cascade,
  from_name text,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  done boolean not null default false
);
create index if not exists inbox_to on public.inbox (to_user, done, created_at desc);
create table if not exists public.daily_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null,
  n int not null default 0,
  primary key (user_id, day, kind)
);
create table if not exists public.boss (
  week text primary key,
  name text not null,
  max_hp int not null,
  dmg int not null default 0
);
create table if not exists public.boss_hits (
  week text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  dmg int not null default 0,
  claimed boolean not null default false,
  primary key (week, user_id)
);
create table if not exists public.catch_scores (
  week text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  primary key (week, user_id)
);
create table if not exists public.likes (
  toy_id text not null references public.toys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (toy_id, user_id)
);

-- ---------- row level security
alter table public.profiles enable row level security;
alter table public.recovery enable row level security;
alter table public.saves enable row level security;
alter table public.toys enable row level security;
alter table public.friends enable row level security;
alter table public.inbox enable row level security;
alter table public.daily_limits enable row level security;
alter table public.boss enable row level security;
alter table public.boss_hits enable row level security;
alter table public.catch_scores enable row level security;
alter table public.likes enable row level security;

create or replace function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friends where a = auth.uid() and b = other);
$$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_friend(id));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (avatar, title, level, stars, stickers, wins, updated_at) on public.profiles to authenticated;

drop policy if exists "own save" on public.saves;
create policy "own save" on public.saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "see own and friends toys" on public.toys;
create policy "see own and friends toys" on public.toys for select to authenticated using (owner = auth.uid() or public.is_friend(owner));
drop policy if exists "write own toys" on public.toys;
create policy "write own toys" on public.toys for insert to authenticated with check (owner = auth.uid());
drop policy if exists "update own toys" on public.toys;
create policy "update own toys" on public.toys for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "delete own toys" on public.toys;
create policy "delete own toys" on public.toys for delete to authenticated using (owner = auth.uid());

drop policy if exists "own friends" on public.friends;
create policy "own friends" on public.friends for select to authenticated using (a = auth.uid());

drop policy if exists "own inbox" on public.inbox;
create policy "own inbox" on public.inbox for select to authenticated using (to_user = auth.uid());
-- everything else (recovery, limits, boss, scores, likes) only through the functions below

-- ---------- helpers
create or replace function public.ps_week() returns text language sql stable as $$ select to_char(now() at time zone 'utc', 'IYYY-"W"IW') $$;

create or replace function public.ps_rand_code(n int) returns text language plpgsql volatile as $$
declare abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; r text := ''; i int;
begin
  for i in 1..n loop r := r || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
  return r;
end $$;

-- counts an action per user per day; false when the daily limit is reached
create or replace function public.ps_take(p_kind text, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.daily_limits (user_id, day, kind, n) values (auth.uid(), current_date, p_kind, 1)
  on conflict (user_id, day, kind) do update set n = daily_limits.n + 1
  returning n into v;
  if v > p_max then
    update public.daily_limits set n = p_max where user_id = auth.uid() and day = current_date and kind = p_kind;
    return false;
  end if;
  return true;
end $$;

-- ---------- accounts
create or replace function public.username_free(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(p_name));
$$;

-- called right after sign-up: creates the profile, friend code and recovery code (shown once)
create or replace function public.init_profile(p_username text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); c text; rc text; p public.profiles;
begin
  if me is null then raise exception 'not logged in'; end if;
  select * into p from public.profiles where id = me;
  if found then return json_build_object('code', p.code, 'username', p.username, 'recovery', null); end if;
  loop
    c := public.ps_rand_code(4) || '-' || public.ps_rand_code(2);
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  insert into public.profiles (id, username, code) values (me, lower(p_username), c);
  rc := public.ps_rand_code(4) || '-' || public.ps_rand_code(4);
  insert into public.recovery (user_id, code_hash) values (me, crypt(rc, gen_salt('bf')))
  on conflict (user_id) do update set code_hash = excluded.code_hash, tries = 0;
  return json_build_object('code', c, 'username', lower(p_username), 'recovery', rc);
end $$;

-- forgot password: username + recovery code -> new password (no e-mail needed)
create or replace function public.reset_password(p_username text, p_code text, p_new text) returns boolean
language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid; r public.recovery;
begin
  if length(coalesce(p_new, '')) < 6 then raise exception 'password too short'; end if;
  select id into uid from public.profiles where username = lower(p_username);
  if uid is null then return false; end if;
  select * into r from public.recovery where user_id = uid;
  if r is null then return false; end if;
  if r.tries >= 5 and r.last_try > now() - interval '1 hour' then raise exception 'too many tries, wait an hour'; end if;
  if crypt(upper(trim(p_code)), r.code_hash) <> r.code_hash then
    update public.recovery set tries = case when last_try < now() - interval '1 hour' then 1 else tries + 1 end, last_try = now() where user_id = uid;
    return false;
  end if;
  update auth.users set encrypted_password = crypt(p_new, gen_salt('bf')), updated_at = now() where id = uid;
  update public.recovery set tries = 0, last_try = now() where user_id = uid;
  return true;
end $$;

-- a fresh recovery code (the old one stops working)
create or replace function public.new_recovery_code() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare rc text := public.ps_rand_code(4) || '-' || public.ps_rand_code(4);
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  insert into public.recovery (user_id, code_hash) values (auth.uid(), crypt(rc, gen_salt('bf')))
  on conflict (user_id) do update set code_hash = excluded.code_hash, tries = 0;
  return rc;
end $$;

-- ---------- friends
create or replace function public.add_friend(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f public.profiles; myname text;
begin
  if me is null then raise exception 'not logged in'; end if;
  select * into f from public.profiles where code = upper(trim(p_code));
  if f.id is null then return json_build_object('ok', false, 'error', 'No player with this code'); end if;
  if f.id = me then return json_build_object('ok', false, 'error', 'That is your own code!'); end if;
  if not public.ps_take('add_friend', 20) then return json_build_object('ok', false, 'error', 'Too many new friends today'); end if;
  insert into public.friends (a, b) values (me, f.id), (f.id, me) on conflict do nothing;
  select username into myname from public.profiles where id = me;
  insert into public.inbox (to_user, from_user, from_name, kind) values (f.id, me, myname, 'friend');
  return json_build_object('ok', true, 'id', f.id, 'username', f.username);
end $$;

create or replace function public.remove_friend(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friends where (a = auth.uid() and b = p_id) or (a = p_id and b = auth.uid());
$$;

create or replace function public.my_friends() returns table (id uuid, username text, title text, avatar jsonb, level int, stars int, stickers int, wins int)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.title, p.avatar, p.level, p.stars, p.stickers, p.wins
  from public.friends fr join public.profiles p on p.id = fr.b
  where fr.a = auth.uid() order by p.username;
$$;

-- ---------- inbox: stickers, gifts, "X beat your toy!"
create or replace function public.send_inbox(p_to uuid, p_kind text, p_payload jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); myname text; lim int;
begin
  if me is null then raise exception 'not logged in'; end if;
  if not public.is_friend(p_to) then return json_build_object('ok', false, 'error', 'Not your friend'); end if;
  lim := case p_kind when 'sticker' then 40 when 'beat' then 40 when 'gift_capsule' then 1 when 'gift_boost' then 3 else 0 end;
  if lim = 0 then return json_build_object('ok', false, 'error', 'Unknown message'); end if;
  if not public.ps_take(p_kind, lim) then
    return json_build_object('ok', false, 'error', case p_kind when 'gift_capsule' then 'You can send one capsule a day' else 'That''s enough for today!' end);
  end if;
  select username into myname from public.profiles where id = me;
  insert into public.inbox (to_user, from_user, from_name, kind, payload)
  values (p_to, me, myname, p_kind, coalesce(p_payload, '{}'::jsonb) - 'from');
  return json_build_object('ok', true);
end $$;

-- marks a message as done and returns it once (gifts can only be claimed once)
create or replace function public.claim_inbox(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare m public.inbox;
begin
  update public.inbox set done = true where id = p_id and to_user = auth.uid() and not done returning * into m;
  if m.id is null then return null; end if;
  return row_to_json(m);
end $$;

-- ---------- weekly co-op boss (everyone hits the same Pillow Kraken)
create or replace function public.boss_status() returns json
language plpgsql security definer set search_path = public as $$
declare w text := public.ps_week(); b public.boss; h public.boss_hits; tries int;
begin
  insert into public.boss (week, name, max_hp) values (w, 'Pillow Kraken', 6000) on conflict (week) do nothing;
  select * into b from public.boss where week = w;
  select * into h from public.boss_hits where week = w and user_id = auth.uid();
  select coalesce((select n from public.daily_limits where user_id = auth.uid() and day = current_date and kind = 'boss'), 0) into tries;
  return json_build_object('week', w, 'name', b.name, 'max_hp', b.max_hp, 'dmg', least(b.dmg, b.max_hp),
    'my_dmg', coalesce(h.dmg, 0), 'claimed', coalesce(h.claimed, false), 'tries_left', greatest(0, 3 - tries));
end $$;

create or replace function public.boss_start() returns boolean
language sql security definer set search_path = public as $$ select public.ps_take('boss', 3); $$;

create or replace function public.boss_hit(p_dmg int) returns json
language plpgsql security definer set search_path = public as $$
declare w text := public.ps_week(); d int := greatest(0, least(coalesce(p_dmg, 0), 400));
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if not public.ps_take('boss_hit', 3) then return public.boss_status(); end if;
  insert into public.boss (week, name, max_hp) values (w, 'Pillow Kraken', 6000) on conflict (week) do nothing;
  update public.boss set dmg = least(max_hp, dmg + d) where week = w;
  insert into public.boss_hits (week, user_id, dmg) values (w, auth.uid(), d)
  on conflict (week, user_id) do update set dmg = boss_hits.dmg + d;
  return public.boss_status();
end $$;

create or replace function public.boss_claim() returns boolean
language plpgsql security definer set search_path = public as $$
declare w text := public.ps_week(); ok boolean;
begin
  update public.boss_hits h set claimed = true
  where h.week = w and h.user_id = auth.uid() and not h.claimed and h.dmg > 0
    and exists (select 1 from public.boss b where b.week = w and b.dmg >= b.max_hp)
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- ---------- Star Catch weekly scores among friends
create or replace function public.submit_catch(p_score int) returns void
language sql security definer set search_path = public as $$
  insert into public.catch_scores (week, user_id, score) values (public.ps_week(), auth.uid(), greatest(0, least(p_score, 300)))
  on conflict (week, user_id) do update set score = greatest(catch_scores.score, excluded.score);
$$;

create or replace function public.catch_board() returns table (username text, avatar jsonb, score int, me boolean)
language sql stable security definer set search_path = public as $$
  select p.username, p.avatar, s.score, p.id = auth.uid()
  from public.catch_scores s join public.profiles p on p.id = s.user_id
  where s.week = public.ps_week() and (s.user_id = auth.uid() or public.is_friend(s.user_id))
  order by s.score desc limit 30;
$$;

-- ---------- toy museum: my toys + friends' toys, with hearts
create or replace function public.museum() returns table (id text, owner uuid, username text, meta jsonb, img text, likes int, liked boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.owner, p.username, t.meta, t.img,
    (select count(*)::int from public.likes l where l.toy_id = t.id),
    exists (select 1 from public.likes l where l.toy_id = t.id and l.user_id = auth.uid())
  from public.toys t join public.profiles p on p.id = t.owner
  where t.owner = auth.uid() or public.is_friend(t.owner)
  order by 6 desc, t.created_at desc limit 80;
$$;

create or replace function public.toggle_like(p_toy text) returns int
language plpgsql security definer set search_path = public as $$
declare o uuid; n int;
begin
  select owner into o from public.toys where id = p_toy;
  if o is null or not (o = auth.uid() or public.is_friend(o)) then return 0; end if;
  if exists (select 1 from public.likes where toy_id = p_toy and user_id = auth.uid()) then
    delete from public.likes where toy_id = p_toy and user_id = auth.uid();
  else
    insert into public.likes (toy_id, user_id) values (p_toy, auth.uid());
  end if;
  select count(*) into n from public.likes where toy_id = p_toy;
  return n;
end $$;

-- ---------- who may call what
revoke all on function public.reset_password(text, text, text) from public;
grant execute on function public.reset_password(text, text, text) to anon, authenticated;
grant execute on function public.username_free(text) to anon, authenticated;
revoke execute on function public.ps_take(text, int) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['init_profile(text)', 'new_recovery_code()', 'add_friend(text)', 'remove_friend(uuid)', 'my_friends()',
    'send_inbox(uuid, text, jsonb)', 'claim_inbox(bigint)', 'boss_status()', 'boss_start()', 'boss_hit(int)', 'boss_claim()',
    'submit_catch(int)', 'catch_board()', 'museum()', 'toggle_like(text)', 'is_friend(uuid)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------- storage for toy pictures: public read, each player writes only into their own folder
insert into storage.buckets (id, name, public) values ('toys', 'toys', true) on conflict (id) do nothing;
drop policy if exists "toy pics upload own" on storage.objects;
create policy "toy pics upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'toys' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "toy pics read own" on storage.objects;
create policy "toy pics read own" on storage.objects for select to authenticated
  using (bucket_id = 'toys' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "toy pics update own" on storage.objects;
create policy "toy pics update own" on storage.objects for update to authenticated
  using (bucket_id = 'toys' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "toy pics delete own" on storage.objects;
create policy "toy pics delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'toys' and (storage.foldername(name))[1] = auth.uid()::text);
