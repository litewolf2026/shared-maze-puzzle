-- Authoritative decision-node semantics for V2 navigation.
-- A node is a band decision if it is forced by narrative/room semantics or has 3+ exits.
create table if not exists public.maze_forced_decision_nodes (
  scenario_id text not null,
  node_id text not null,
  primary key (scenario_id,node_id)
);

alter table public.maze_forced_decision_nodes enable row level security;
revoke all on public.maze_forced_decision_nodes from public, anon, authenticated;

insert into public.maze_forced_decision_nodes(scenario_id,node_id) values
  -- Exact 25 black-band source nodes.
  ('selem-01','A01'),('selem-01','A02'),('selem-01','A03'),('selem-01','A05'),('selem-01','A07'),
  ('selem-01','A09'),('selem-01','A10'),('selem-01','A13'),('selem-01','A15'),('selem-01','B01'),
  ('selem-01','B02'),('selem-01','B03'),('selem-01','B04'),('selem-01','B08'),('selem-01','B09'),
  ('selem-01','B10'),('selem-01','B12'),('selem-01','B15'),('selem-01','C01'),('selem-01','C02'),
  ('selem-01','C03'),('selem-01','C04'),('selem-01','C08'),('selem-01','C09'),('selem-01','C12'),
  -- Off-route rooms / special chambers whose departure is a deliberate choice.
  ('selem-01','A06'),('selem-01','B07'),('selem-01','C07'),('selem-01','C10'),('selem-01','C11'),('selem-01','C14'),('selem-01','C15'),
  ('selem-01','A22'),('selem-01','A27'),('selem-01','A29'),
  ('selem-01','B22'),('selem-01','B27'),('selem-01','B29'),('selem-01','B31'),('selem-01','B33'),
  ('selem-01','C17'),('selem-01','C21'),('selem-01','C22'),('selem-01','C24'),('selem-01','C26'),
  ('selem-01','D03'),('selem-01','D05'),('selem-01','D06'),('selem-01','D08'),('selem-01','D10'),('selem-01','D11'),('selem-01','D12')
on conflict do nothing;

create or replace function public.maze_node_is_decision(p_scenario_id text,p_node text)
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
    select count(*) >= 3 from public.maze_edges e
    where e.scenario_id=p_scenario_id and e.from_node=p_node
  );
$$;
revoke execute on function public.maze_node_is_decision(text,text) from public,anon,authenticated;

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
      if not exists(select 1 from public.maze_edges e where e.scenario_id=p_scenario_id and e.from_node=v_h->>'from' and e.dir=v_h->>'dir' and e.to_node=v_h->>'to') then return false; end if;
      v_is_decision:=public.maze_node_is_decision(p_scenario_id,v_h->>'from');
      if v_is_decision then
        if v_expected>=jsonb_array_length(v_decisions) then return false; end if;
        v_d:=v_decisions->v_expected;
        if v_d->>'from'<>v_h->>'from' or v_d->>'dir'<>v_h->>'dir' or v_d->>'to'<>v_h->>'to' then return false; end if;
        v_expected:=v_expected+1;
      end if;
      v_current:=v_h->>'to';
    end loop;
  end if;

  v_transit:=p_state->'transit';
  if v_transit is not null and jsonb_typeof(v_transit)<>'null' then
    if jsonb_typeof(v_transit)<>'object' or v_transit->>'from'<>v_current then return false; end if;
    if (v_transit->>'cells')::integer<1 or (v_transit->>'progress')::integer<0 or (v_transit->>'progress')::integer>(v_transit->>'cells')::integer then return false; end if;
    if not exists(select 1 from public.maze_edges e where e.scenario_id=p_scenario_id and e.from_node=v_transit->>'from' and e.dir=v_transit->>'dir' and e.to_node=v_transit->>'to') then return false; end if;
    v_is_decision:=public.maze_node_is_decision(p_scenario_id,v_transit->>'from');
    if coalesce((v_transit->>'decisionAdded')::boolean,false) then
      if not v_is_decision or coalesce((v_transit->>'rewind')::boolean,false) then return false; end if;
      if v_expected>=jsonb_array_length(v_decisions) then return false; end if;
      v_d:=v_decisions->v_expected;
      if v_d->>'from'<>v_transit->>'from' or v_d->>'dir'<>v_transit->>'dir' or v_d->>'to'<>v_transit->>'to' then return false; end if;
      v_expected:=v_expected+1;
    elsif v_is_decision and not coalesce((v_transit->>'rewind')::boolean,false) then
      return false;
    end if;
    v_node:=v_transit->>'from';
  else
    v_node:=p_state->>'node'; if v_node<>v_current then return false; end if;
  end if;

  if v_expected<>v_band then return false; end if;
  if not exists(select 1 from (select start_node node from public.maze_scenario_rules where scenario_id=p_scenario_id union select from_node from public.maze_edges where scenario_id=p_scenario_id union select to_node from public.maze_edges where scenario_id=p_scenario_id) q where q.node=v_node) then return false; end if;
  if v_node=v_goal and (v_transit is null or jsonb_typeof(v_transit)='null') and v_band<>v_limit then return false; end if;
  return true;
exception when others then return false;
end;
$$;
revoke execute on function public.validate_maze_state(text,jsonb) from public,anon,authenticated;
