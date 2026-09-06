-- General content-state authority for multiplayer rooms.
-- Players may materialize fresh deterministic assignments as unresolved and may
-- mark visible loot/discovery assignments as discovered. All hazard/encounter/event
-- outcomes, terminal states, secret transitions and runtime outcome logs are GM-owned.

create or replace function public.maze_player_content_transitions_allowed(
  p_old_state jsonb,
  p_new_state jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  r record;
  v_old jsonb;
  v_new jsonb;
  v_old_state text;
  v_new_state text;
  v_type text;
  v_hidden boolean;
  v_room text;
  v_slot text;
begin
  -- Existing assignments must remain present and immutable apart from the one
  -- explicitly player-owned transition unresolved -> discovered on visible loot/discovery.
  for r in
    select room.key as room_id,a.value as assignment
    from jsonb_each(coalesce(p_old_state->'roomState','{}'::jsonb)) room
    cross join lateral jsonb_array_elements(coalesce(room.value#>'{content,assignments}','[]'::jsonb)) a
  loop
    v_room:=r.room_id;
    v_slot:=r.assignment->>'slotId';
    v_old:=r.assignment;
    select a.value into v_new
    from jsonb_array_elements(coalesce(p_new_state #> array['roomState',v_room,'content','assignments'],'[]'::jsonb)) a
    where a.value->>'slotId'=v_slot
    limit 1;
    if v_new is null then return false; end if;

    -- Protect all established identity/gameplay metadata. The four listed fields
    -- may be added to old materialized states by plan-version backfill, but once
    -- present they are immutable to player-token updates too.
    if (v_new-'state'-'anchor'-'origin'-'description'-'mechanics') is distinct from
       (v_old-'state'-'anchor'-'origin'-'description'-'mechanics') then return false; end if;
    if v_old ? 'anchor' and v_new->'anchor' is distinct from v_old->'anchor' then return false; end if;
    if v_old ? 'origin' and v_new->'origin' is distinct from v_old->'origin' then return false; end if;
    if v_old ? 'description' and v_new->'description' is distinct from v_old->'description' then return false; end if;
    if v_old ? 'mechanics' and v_new->'mechanics' is distinct from v_old->'mechanics' then return false; end if;

    v_old_state:=v_old->>'state';
    v_new_state:=v_new->>'state';
    if v_new_state is distinct from v_old_state then
      v_type:=v_old->>'type';
      v_hidden:=coalesce((v_old->>'hidden')::boolean,false);
      if not (
        v_old_state='unresolved'
        and v_new_state='discovered'
        and v_type in ('loot','discovery')
        and not v_hidden
      ) then return false; end if;
    end if;
  end loop;

  -- New assignments may only enter through deterministic room materialization.
  -- A player cannot materialize an already discovered/triggered/resolved outcome.
  for r in
    select room.key as room_id,a.value as assignment
    from jsonb_each(coalesce(p_new_state->'roomState','{}'::jsonb)) room
    cross join lateral jsonb_array_elements(coalesce(room.value#>'{content,assignments}','[]'::jsonb)) a
  loop
    v_room:=r.room_id;
    v_slot:=r.assignment->>'slotId';
    select a.value into v_old
    from jsonb_array_elements(coalesce(p_old_state #> array['roomState',v_room,'content','assignments'],'[]'::jsonb)) a
    where a.value->>'slotId'=v_slot
    limit 1;
    if v_old is null then
      if coalesce(r.assignment->>'state','')<>'unresolved' then return false; end if;
      if r.assignment ? 'runtime' then return false; end if;
    end if;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;
revoke execute on function public.maze_player_content_transitions_allowed(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.update_maze_room(p_room_code text,p_token text,p_expected_version bigint,p_state jsonb)
returns table(version bigint,state jsonb)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row public.maze_rooms%rowtype;
  v_is_gm boolean;
begin
  select * into v_row
  from public.maze_rooms r
  where r.room_code=upper(p_room_code)
    and (
      extensions.digest(p_token,'sha256')=r.play_token_hash
      or extensions.digest(p_token,'sha256')=r.gm_token_hash
    )
  for update;

  if not found then raise exception 'ROOM_OR_TOKEN_INVALID'; end if;
  if v_row.version<>p_expected_version then raise exception 'STALE_VERSION'; end if;
  if not public.validate_maze_state(v_row.scenario_id,p_state) then raise exception 'INVALID_MAZE_STATE'; end if;

  v_is_gm:=extensions.digest(p_token,'sha256')=v_row.gm_token_hash;
  if not v_is_gm and not public.maze_player_unlock_states_unchanged(v_row.scenario_id,v_row.state,p_state) then
    raise exception 'SECRET_STATE_REQUIRES_GM';
  end if;
  if not v_is_gm and not public.maze_player_content_transitions_allowed(v_row.state,p_state) then
    raise exception 'CONTENT_STATE_REQUIRES_GM';
  end if;

  update public.maze_rooms r
  set state=p_state,
      version=r.version+1,
      updated_at=now()
  where r.room_code=v_row.room_code
  returning r.version,r.state into version,state;

  perform realtime.send(
    jsonb_build_object('room_code',v_row.room_code,'version',version,'state',state),
    'state',
    'maze:'||v_row.room_code||':'||v_row.channel_secret,
    false
  );

  return next;
end;
$$;
