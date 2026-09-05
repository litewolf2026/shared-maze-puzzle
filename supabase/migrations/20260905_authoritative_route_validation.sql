create table if not exists public.maze_scenario_rules (
  scenario_id text primary key,
  start_node text not null,
  goal_node text not null,
  solution_length integer not null check (solution_length > 0)
);

create table if not exists public.maze_edges (
  scenario_id text not null references public.maze_scenario_rules(scenario_id) on delete cascade,
  from_node text not null,
  dir text not null,
  to_node text not null,
  primary key (scenario_id, from_node, dir)
);

revoke all on table public.maze_scenario_rules from anon, authenticated;
revoke all on table public.maze_edges from anon, authenticated;

insert into public.maze_scenario_rules(scenario_id, start_node, goal_node, solution_length)
values ('selem-01','A01','C15',25)
on conflict (scenario_id) do update
set start_node=excluded.start_node,
    goal_node=excluded.goal_node,
    solution_length=excluded.solution_length;

delete from public.maze_edges where scenario_id='selem-01';

do $$
declare
  e jsonb;
  v_from text;
  v_dir text;
  v_to text;
  v_rev text;
begin
  for e in select value from jsonb_array_elements($edges$[
    ["A01","E","A02"],["A02","E","A03"],["A03","NE","A04"],["A03","SE","A05"],["A05","E","A06"],["A05","SW","A07"],["A07","W","A08"],["A07","SE","A09"],["A07","SW","A16"],["A09","E","A10"],["A09","SW","A18"],["A10","NE","A11"],["A10","S","A19"],["A10","E","A13"],["A11","S","A12"],["A11","SW","A10"],["A13","E","A14"],["A13","S","A15"],["A16","W","A17"],["A16","SE","A18"],["A18","E","A19"],["A19","E","A20"],["A15","DOWN","B01"],
    ["B01","SW","B02"],["B02","W","B03"],["B03","W","B04"],["B04","NW","B05"],["B04","SW","B06"],["B04","SE","B08"],["B06","W","B07"],["B06","SE","B08"],["B08","E","B09"],["B08","S","B16"],["B09","E","B10"],["B09","S","B14"],["B10","NE","B11"],["B10","SE","B12"],["B12","SW","B13"],["B12","S","B15"],["B13","W","B14"],["B16","W","B17"],["B16","NW","B18"],["B18","W","B19"],["B18","S","B20"],["B15","DOWN","C01"],
    ["C01","SW","C02"],["C02","W","C03"],["C03","W","C04"],["C04","NW","C05"],["C04","SW","C06"],["C04","SE","C08"],["C06","W","C07"],["C06","SE","C08"],["C08","E","C09"],["C09","E","C10"],["C09","NE","C11"],["C09","SE","C12"],["C12","NE","C14"],["C12","SW","C13"],["C12","S","C15"],["B01","UP","A15"],["C01","UP","B15"]
  ]$edges$::jsonb)
  loop
    v_from:=e->>0; v_dir:=e->>1; v_to:=e->>2;
    insert into public.maze_edges(scenario_id,from_node,dir,to_node)
    values ('selem-01',v_from,v_dir,v_to)
    on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

    v_rev:=case v_dir
      when 'N' then 'S' when 'NE' then 'SW' when 'E' then 'W' when 'SE' then 'NW'
      when 'S' then 'N' when 'SW' then 'NE' when 'W' then 'E' when 'NW' then 'SE'
      when 'UP' then 'DOWN' when 'DOWN' then 'UP' end;
    if v_rev is not null then
      insert into public.maze_edges(scenario_id,from_node,dir,to_node)
      values ('selem-01',v_to,v_rev,v_from)
      on conflict (scenario_id,from_node,dir) do nothing;
    end if;
  end loop;
end $$;

create or replace function public.validate_maze_state(p_scenario_id text, p_state jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start text;
  v_goal text;
  v_limit integer;
  v_step integer;
  v_history jsonb;
  v_len integer;
  v_node text;
  v_h jsonb;
  i integer;
begin
  select r.start_node,r.goal_node,r.solution_length
    into v_start,v_goal,v_limit
  from public.maze_scenario_rules r
  where r.scenario_id=p_scenario_id;
  if not found then return false; end if;

  v_history:=coalesce(p_state->'history','[]'::jsonb);
  if jsonb_typeof(v_history)<>'array' then return false; end if;
  v_len:=jsonb_array_length(v_history);
  v_step:=(p_state->>'step')::integer;
  if v_step<>v_len or v_step<0 or v_step>v_limit then return false; end if;

  v_node:=v_start;
  if v_len>0 then
    for i in 0..v_len-1 loop
      v_h:=v_history->i;
      if v_h->>'from'<>v_node then return false; end if;
      if not exists (
        select 1 from public.maze_edges e
        where e.scenario_id=p_scenario_id
          and e.from_node=v_h->>'from'
          and e.dir=v_h->>'dir'
          and e.to_node=v_h->>'to'
      ) then return false; end if;
      v_node:=v_h->>'to';
    end loop;
  end if;

  if p_state->>'node'<>v_node then return false; end if;
  if v_node=v_goal and v_step<>v_limit then return false; end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke execute on function public.validate_maze_state(text,jsonb) from public, anon, authenticated;

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
  if not public.validate_maze_state(v_row.scenario_id,p_state) then raise exception 'INVALID_MAZE_STATE'; end if;

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
  if not public.validate_maze_state(v_row.scenario_id,p_state) then raise exception 'INVALID_MAZE_STATE'; end if;

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

revoke execute on function public.update_maze_room(text,text,bigint,jsonb) from public, authenticated;
grant execute on function public.update_maze_room(text,text,bigint,jsonb) to anon;
revoke execute on function public.gm_update_maze_room(text,text,bigint,jsonb) from public, authenticated;
grant execute on function public.gm_update_maze_room(text,text,bigint,jsonb) to anon;
