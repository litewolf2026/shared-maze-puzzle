-- Player-owned loot pickup for the shared group inventory.
-- The inventory itself is derived from room assignments in state='taken', so no
-- duplicate inventory state is stored. Players may only take already discovered loot.

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
  -- Existing assignments must remain present and immutable apart from the two
  -- explicitly player-owned transitions:
  --   visible loot/discovery: unresolved -> discovered
  --   discovered loot:       discovered -> taken
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
        (
          v_old_state='unresolved'
          and v_new_state='discovered'
          and v_type in ('loot','discovery')
          and not v_hidden
        )
        or
        (
          v_old_state='discovered'
          and v_new_state='taken'
          and v_type='loot'
        )
      ) then return false; end if;
    end if;
  end loop;

  -- New assignments may only enter through deterministic room materialization.
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
