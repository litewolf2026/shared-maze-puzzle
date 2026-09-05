create extension if not exists pgcrypto with schema extensions;

create table public.maze_rooms (
  room_code text primary key,
  scenario_id text not null,
  play_token_hash bytea not null,
  gm_token_hash bytea not null,
  channel_secret text not null,
  state jsonb not null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maze_rooms enable row level security;
revoke all on table public.maze_rooms from anon, authenticated;

create or replace function public.create_maze_room(p_scenario_id text, p_state jsonb)
returns table(room_code text, play_token text, gm_token text, channel_secret text, version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room text;
  v_play text;
  v_gm text;
  v_channel text;
begin
  loop
    v_room := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.maze_rooms r where r.room_code = v_room);
  end loop;

  v_play := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_gm := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_channel := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.maze_rooms(room_code, scenario_id, play_token_hash, gm_token_hash, channel_secret, state)
  values (
    v_room,
    p_scenario_id,
    extensions.digest(v_play, 'sha256'),
    extensions.digest(v_gm, 'sha256'),
    v_channel,
    p_state
  );

  return query select v_room, v_play, v_gm, v_channel, 0::bigint;
end;
$$;

create or replace function public.get_maze_room(p_room_code text, p_token text)
returns table(room_code text, scenario_id text, state jsonb, version bigint, channel_secret text, is_gm boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select r.room_code,
         r.scenario_id,
         r.state,
         r.version,
         r.channel_secret,
         extensions.digest(p_token, 'sha256') = r.gm_token_hash as is_gm
  from public.maze_rooms r
  where r.room_code = upper(p_room_code)
    and (
      extensions.digest(p_token, 'sha256') = r.play_token_hash
      or extensions.digest(p_token, 'sha256') = r.gm_token_hash
    );
end;
$$;

create or replace function public.update_maze_room(
  p_room_code text,
  p_token text,
  p_expected_version bigint,
  p_state jsonb
)
returns table(version bigint, state jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.maze_rooms%rowtype;
begin
  select * into v_row
  from public.maze_rooms r
  where r.room_code = upper(p_room_code)
    and (
      extensions.digest(p_token, 'sha256') = r.play_token_hash
      or extensions.digest(p_token, 'sha256') = r.gm_token_hash
    )
  for update;

  if not found then raise exception 'ROOM_OR_TOKEN_INVALID'; end if;
  if v_row.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;

  update public.maze_rooms r
  set state = p_state,
      version = r.version + 1,
      updated_at = now()
  where r.room_code = v_row.room_code
  returning r.version, r.state into version, state;

  perform realtime.send(
    jsonb_build_object('room_code', v_row.room_code, 'version', version, 'state', state),
    'state',
    'maze:' || v_row.room_code || ':' || v_row.channel_secret,
    false
  );

  return next;
end;
$$;

create or replace function public.gm_update_maze_room(
  p_room_code text,
  p_gm_token text,
  p_expected_version bigint,
  p_state jsonb
)
returns table(version bigint, state jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.maze_rooms%rowtype;
begin
  select * into v_row
  from public.maze_rooms r
  where r.room_code = upper(p_room_code)
    and extensions.digest(p_gm_token, 'sha256') = r.gm_token_hash
  for update;

  if not found then raise exception 'ROOM_OR_GM_TOKEN_INVALID'; end if;
  if v_row.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;

  update public.maze_rooms r
  set state = p_state,
      version = r.version + 1,
      updated_at = now()
  where r.room_code = v_row.room_code
  returning r.version, r.state into version, state;

  perform realtime.send(
    jsonb_build_object('room_code', v_row.room_code, 'version', version, 'state', state),
    'state',
    'maze:' || v_row.room_code || ':' || v_row.channel_secret,
    false
  );

  return next;
end;
$$;

revoke execute on function public.create_maze_room(text, jsonb) from public, anon, authenticated;

revoke execute on function public.get_maze_room(text, text) from public, authenticated;
grant execute on function public.get_maze_room(text, text) to anon;

revoke execute on function public.update_maze_room(text, text, bigint, jsonb) from public, authenticated;
grant execute on function public.update_maze_room(text, text, bigint, jsonb) to anon;

revoke execute on function public.gm_update_maze_room(text, text, bigint, jsonb) from public, authenticated;
grant execute on function public.gm_update_maze_room(text, text, bigint, jsonb) to anon;
