-- Hen Pecks accounts: saves each signed-in player's stats so they follow them to any device.
-- Run this once in Supabase → SQL Editor → New query. It is safe to run again after changes.

-- One row per player.
--   log:     one finished game per day, {"2026-09-28": "t2", ...}. Stats are worked out from this,
--            so merging two devices can never count the same day twice.
--   base:    totals from before games were logged by day (played, wins, best, streak, last, dist).
--   devices: devices whose old totals were already added to base, so a retry can't add them twice.
create table if not exists public.pecks_players (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  log        jsonb  not null default '{}'::jsonb,
  base       jsonb  not null default '{}'::jsonb,
  devices    text[] not null default '{}',
  settings   jsonb  not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row-level security: a player can only ever see or change their own row.
alter table public.pecks_players enable row level security;

drop policy if exists "Players read their own row" on public.pecks_players;
create policy "Players read their own row" on public.pecks_players
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Players create their own row" on public.pecks_players;
create policy "Players create their own row" on public.pecks_players
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Players update their own row" on public.pecks_players;
create policy "Players update their own row" on public.pecks_players
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.pecks_players from anon;
grant select, insert, update on public.pecks_players to authenticated;

-- Adds one device's old totals to another's.
create or replace function public.pecks_add_base(a jsonb, b jsonb)
returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'played', coalesce((a->>'played')::int, 0) + coalesce((b->>'played')::int, 0),
    'wins',   coalesce((a->>'wins')::int, 0)   + coalesce((b->>'wins')::int, 0),
    'best',   greatest(coalesce((a->>'best')::int, 0), coalesce((b->>'best')::int, 0)),
    -- The streak that is still going is the one whose last win is newer.
    'streak', case
                when coalesce(b->>'last', '') > coalesce(a->>'last', '') then coalesce((b->>'streak')::int, 0)
                when coalesce(b->>'last', '') < coalesce(a->>'last', '') then coalesce((a->>'streak')::int, 0)
                else greatest(coalesce((a->>'streak')::int, 0), coalesce((b->>'streak')::int, 0))
              end,
    'last',   nullif(greatest(coalesce(a->>'last', ''), coalesce(b->>'last', '')), ''),
    'dist',   (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                 from (select k, sum(v::int) as n
                         from (select key as k, value as v from jsonb_each_text(coalesce(a->'dist', '{}'::jsonb))
                               union all
                               select key, value from jsonb_each_text(coalesce(b->'dist', '{}'::jsonb))) x
                        group by k) y)
  )
$$;

-- The one call the game makes. Merges this device's games into the player's row and returns the row.
--   p_log:      this device's games by day. Days already saved keep their saved result.
--   p_base:     this device's totals from before day-by-day logging (sent until the device is recorded).
--   p_device:   a random id for this browser.
--   p_settings: hard mode etc. With p_overwrite_settings false (first sign-in) the saved settings win.
create or replace function public.pecks_sync(
  p_log jsonb default '{}'::jsonb,
  p_base jsonb default null,
  p_device text default null,
  p_settings jsonb default null,
  p_overwrite_settings boolean default false
)
returns public.pecks_players
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean jsonb;
  add_base boolean;
  r public.pecks_players;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if jsonb_typeof(coalesce(p_log, '{}'::jsonb)) <> 'object' then
    raise exception 'p_log must be an object' using errcode = '22023';
  end if;

  -- Keep only well-formed days and known outcomes.
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into clean
    from jsonb_each(coalesce(p_log, '{}'::jsonb)) e
   where e.key ~ '^\d{4}-\d{2}-\d{2}$'
     and e.value #>> '{}' in ('pecks', 't1', 't2', 't3', 'miss');

  insert into public.pecks_players (user_id) values (uid) on conflict (user_id) do nothing;

  select p_base is not null and p_device is not null and not (p_device = any (p.devices))
    into add_base
    from public.pecks_players p where p.user_id = uid;

  update public.pecks_players p set
    log        = clean || p.log,   -- right side wins, so days already saved keep their result
    base       = case when add_base then public.pecks_add_base(p.base, p_base) else p.base end,
    devices    = case when add_base then p.devices || p_device else p.devices end,
    settings   = case
                   when p_settings is null then p.settings
                   when p_overwrite_settings then p.settings || p_settings
                   else p_settings || p.settings
                 end,
    updated_at = now()
  where p.user_id = uid
  returning p.* into r;

  return r;
end
$$;

revoke all on function public.pecks_sync(jsonb, jsonb, text, jsonb, boolean) from public, anon;
grant execute on function public.pecks_sync(jsonb, jsonb, text, jsonb, boolean) to authenticated;
