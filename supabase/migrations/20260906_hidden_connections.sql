-- Reusable hidden/locked connection requirements.
-- A secret edge exists in the authoritative graph, but is traversable only after
-- the referenced persistent content assignment reaches an allowed open state.

create table if not exists public.maze_edge_requirements (
  scenario_id text not null,
  from_node text not null,
  dir text not null,
  to_node text not null,
  hidden boolean not null default true,
  unlock_node_id text not null,
  unlock_slot_id text not null,
  required_states text[] not null default array['opened','resolved']::text[],
  primary key (scenario_id,from_node,dir,to_node)
);

alter table public.maze_edge_requirements enable row level security;
revoke all on public.maze_edge_requirements from public,anon,authenticated;

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','D12','W','D13'),
  ('selem-01','D13','E','D12')
on conflict do nothing;

insert into public.maze_edge_requirements(scenario_id,from_node,dir,to_node,hidden,unlock_node_id,unlock_slot_id,required_states) values
  ('selem-01','D12','W','D13',true,'D12','secret-connection-authored',array['opened','resolved']::text[]),
  ('selem-01','D13','E','D12',true,'D12','secret-connection-authored',array['opened','resolved']::text[])
on conflict (scenario_id,from_node,dir,to_node) do update set
  hidden=excluded.hidden,
  unlock_node_id=excluded.unlock_node_id,
  unlock_slot_id=excluded.unlock_slot_id,
  required_states=excluded.required_states;

-- D13 is an explorable room. Keep client/server decision semantics aligned even
-- though the black band is already exhausted before this optional branch is reachable.
insert into public.maze_forced_decision_nodes(scenario_id,node_id) values
  ('selem-01','D13')
on conflict do nothing;

create or replace function public.maze_edge_is_available(
  p_scenario_id text,
  p_state jsonb,
  p_from text,
  p_dir text,
  p_to text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.maze_edges e
    where e.scenario_id=p_scenario_id
      and e.from_node=p_from
      and e.dir=p_dir
      and e.to_node=p_to
      and (
        not exists(
          select 1 from public.maze_edge_requirements r
          where r.scenario_id=e.scenario_id
            and r.from_node=e.from_node
            and r.dir=e.dir
            and r.to_node=e.to_node
        )
        or exists(
          select 1
          from public.maze_edge_requirements r
          cross join lateral jsonb_array_elements(
            coalesce(
              p_state #> array['roomState',r.unlock_node_id,'content','assignments'],
              '[]'::jsonb
            )
          ) a
          where r.scenario_id=e.scenario_id
            and r.from_node=e.from_node
            and r.dir=e.dir
            and r.to_node=e.to_node
            and a->>'slotId'=r.unlock_slot_id
            and a->>'state'=any(r.required_states)
        )
      )
  );
$$;
revoke execute on function public.maze_edge_is_available(text,jsonb,text,text,text) from public,anon,authenticated;

create or replace function public.maze_node_is_decision_state(
  p_scenario_id text,
  p_state jsonb,
  p_node text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.maze_forced_decision_nodes f
    where f.scenario_id=p_scenario_id and f.node_id=p_node
  ) or (
    select count(*) >= 3
    from public.maze_edges e
    where e.scenario_id=p_scenario_id
      and e.from_node=p_node
      and public.maze_edge_is_available(p_scenario_id,p_state,e.from_node,e.dir,e.to_node)
  );
$$;
revoke execute on function public.maze_node_is_decision_state(text,jsonb,text) from public,anon,authenticated;

create or replace function public.validate_maze_state(p_scenario_id text,p_state jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_start text; v_goal text; v_limit integer; v_band integer;
  v_decisions jsonb; v_path jsonb; v_transit jsonb; v_node text; v_h jsonb; v_d jsonb;
  v_current text; v_len integer; v_expected integer:=0; i integer; v_is_decision boolean;
begin
  select r.start_node,r.goal_node,r.solution_length into v_start,v_goal,v_limit
  from public.maze_scenario_rules r where r.scenario_id=p_scenario_id;
  if not found or jsonb_typeof(p_state)<>'object' then return false; end if;

  v_band:=coalesce((p_state->>'bandStep')::integer,(p_state->>'step')::integer,0);
  if v_band<0 or v_band>v_limit then return false; end if;
  v_decisions:=coalesce(p_state->'decisionHistory',p_state->'history','[]'::jsonb);
  v_path:=coalesce(p_state->'pathHistory',p_state->'history','[]'::jsonb);
  if jsonb_typeof(v_decisions)<>'array' or jsonb_typeof(v_path)<>'array' then return false; end if;
  if jsonb_array_length(v_decisions)<>v_band then return false; end if;

  v_current:=v_start; v_len:=jsonb_array_length(v_path);
  if v_len>0 then
    for i in 0..v_len-1 loop
      v_h:=v_path->i;
      if v_h->>'from'<>v_current then return false; end if;
      if not public.maze_edge_is_available(p_scenario_id,p_state,v_h->>'from',v_h->>'dir',v_h->>'to') then return false; end if;
      v_is_decision:=public.maze_node_is_decision_state(p_scenario_id,p_state,v_h->>'from');
      if v_is_decision then
        if v_expected<v_band then
          v_d:=v_decisions->v_expected;
          if v_d->>'from'<>v_h->>'from' or v_d->>'dir'<>v_h->>'dir' or v_d->>'to'<>v_h->>'to' then return false; end if;
          v_expected:=v_expected+1;
        elsif v_band<v_limit then
          return false;
        end if;
      end if;
      v_current:=v_h->>'to';
    end loop;
  end if;

  v_transit:=p_state->'transit';
  if v_transit is not null and jsonb_typeof(v_transit)<>'null' then
    if jsonb_typeof(v_transit)<>'object' or v_transit->>'from'<>v_current then return false; end if;
    if (v_transit->>'cells')::integer<1 or (v_transit->>'progress')::integer<0 or (v_transit->>'progress')::integer>(v_transit->>'cells')::integer then return false; end if;
    if not public.maze_edge_is_available(p_scenario_id,p_state,v_transit->>'from',v_transit->>'dir',v_transit->>'to') then return false; end if;
    v_is_decision:=public.maze_node_is_decision_state(p_scenario_id,p_state,v_transit->>'from');
    if coalesce((v_transit->>'decisionAdded')::boolean,false) then
      if not v_is_decision or coalesce((v_transit->>'rewind')::boolean,false) then return false; end if;
      if v_expected>=jsonb_array_length(v_decisions) then return false; end if;
      v_d:=v_decisions->v_expected;
      if v_d->>'from'<>v_transit->>'from' or v_d->>'dir'<>v_transit->>'dir' or v_d->>'to'<>v_transit->>'to' then return false; end if;
      v_expected:=v_expected+1;
    elsif v_is_decision and not coalesce((v_transit->>'rewind')::boolean,false) and v_band<v_limit then
      return false;
    end if;
    v_node:=v_transit->>'from';
  else
    v_node:=p_state->>'node'; if v_node<>v_current then return false; end if;
  end if;

  if v_expected<>v_band then return false; end if;
  if not exists(
    select 1 from (
      select start_node node from public.maze_scenario_rules where scenario_id=p_scenario_id
      union select from_node from public.maze_edges where scenario_id=p_scenario_id
      union select to_node from public.maze_edges where scenario_id=p_scenario_id
    ) q where q.node=v_node
  ) then return false; end if;
  if v_node=v_goal and (v_transit is null or jsonb_typeof(v_transit)='null') and v_band<>v_limit then return false; end if;
  return true;
exception when others then return false;
end;
$$;
revoke execute on function public.validate_maze_state(text,jsonb) from public,anon,authenticated;
