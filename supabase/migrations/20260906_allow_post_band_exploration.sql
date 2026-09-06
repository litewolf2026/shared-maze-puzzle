-- The black band can be exhausted without physically immobilising the party.
-- Decisions made after bandStep == solution_length are traversable, but do not
-- append to decisionHistory because no further band symbol exists.
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
    if not exists(select 1 from public.maze_edges e where e.scenario_id=p_scenario_id and e.from_node=v_transit->>'from' and e.dir=v_transit->>'dir' and e.to_node=v_transit->>'to') then return false; end if;
    v_is_decision:=public.maze_node_is_decision(p_scenario_id,v_transit->>'from');
    if coalesce((v_transit->>'decisionAdded')::boolean,false) then
      if not v_is_decision or coalesce((v_transit->>'rewind')::boolean,false) then return false; end if;
      if v_expected>=v_band then return false; end if;
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
  if not exists(select 1 from (select start_node node from public.maze_scenario_rules where scenario_id=p_scenario_id union select from_node from public.maze_edges where scenario_id=p_scenario_id union select to_node from public.maze_edges where scenario_id=p_scenario_id) q where q.node=v_node) then return false; end if;
  if v_node=v_goal and (v_transit is null or jsonb_typeof(v_transit)='null') and v_band<>v_limit then return false; end if;
  return true;
exception when others then return false;
end;
$$;
revoke execute on function public.validate_maze_state(text,jsonb) from public,anon,authenticated;
