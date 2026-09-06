-- Make the canonical physical route pass through A06, C10 and C14 while
-- keeping the black band at exactly 25 decision departures.
-- A06 and C10 become authored transit rooms: entering/exiting them does not
-- consume another band symbol. C14 is reached only after decision 25, so its
-- later exits are post-band exploration choices.

-- Safety: never guess progress for a client that is currently mid-edge, and
-- never silently reinterpret an old band decision whose direction itself changes.
do $$
begin
  if exists (
    select 1 from public.maze_rooms r
    where r.scenario_id='selem-01'
      and jsonb_typeof(r.state->'transit')='object'
      and (
        (r.state#>>'{transit,from}',r.state#>>'{transit,dir}',r.state#>>'{transit,to}') in (
          ('A05','E','A06'),('A06','W','A05'),('A05','SW','A07'),('A07','NE','A05'),
          ('C09','E','C10'),('C10','W','C09'),('C09','SE','C12'),('C12','NW','C09'),
          ('C12','E','C14'),('C14','W','C12'),('C12','S','C15'),('C15','N','C12'),
          ('C14','N','C26'),('C26','S','C14')
        )
      )
  ) then raise exception 'CANONICAL_ROUTE_MIGRATION_ACTIVE_TRANSIT'; end if;

  if exists (
    select 1
    from public.maze_rooms r
    cross join lateral jsonb_array_elements(coalesce(r.state->'decisionHistory',r.state->'history','[]'::jsonb)) h
    where r.scenario_id='selem-01' and (
      (h->>'from',h->>'dir',h->>'to') in (
        ('A05','E','A06'),('A06','W','A05'),
        ('C09','E','C10'),('C10','W','C09'),
        ('C12','E','C14'),('C14','W','C12'),
        ('C14','N','C26'),('C26','S','C14')
      )
    )
  ) then raise exception 'CANONICAL_ROUTE_MIGRATION_AMBIGUOUS_DECISION'; end if;
end;
$$;

-- Temporary migration helpers. They are dropped at the end of this migration.
create or replace function public._maze_canonical_decisions_v1(p_items jsonb)
returns jsonb
language plpgsql
immutable
set search_path=''
as $$
declare
  e jsonb;
  out_items jsonb := '[]'::jsonb;
begin
  for e in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if e->>'from'='A05' and e->>'dir'='SW' and e->>'to'='A07' then e:=e||jsonb_build_object('to','A06');
    elsif e->>'from'='A07' and e->>'dir'='NE' and e->>'to'='A05' then e:=e||jsonb_build_object('to','A06');
    elsif e->>'from'='C09' and e->>'dir'='SE' and e->>'to'='C12' then e:=e||jsonb_build_object('to','C10');
    elsif e->>'from'='C12' and e->>'dir'='NW' and e->>'to'='C09' then e:=e||jsonb_build_object('to','C10');
    elsif e->>'from'='C12' and e->>'dir'='S' and e->>'to'='C15' then e:=e||jsonb_build_object('to','C14');
    elsif e->>'from'='C15' and e->>'dir'='N' and e->>'to'='C12' then e:=e||jsonb_build_object('to','C14');
    end if;
    out_items:=out_items||jsonb_build_array(e);
  end loop;
  return out_items;
end;
$$;

create or replace function public._maze_canonical_path_v1(p_items jsonb)
returns jsonb
language plpgsql
immutable
set search_path=''
as $$
declare
  e jsonb;
  out_items jsonb := '[]'::jsonb;
begin
  for e in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    if e->>'from'='A05' and e->>'dir'='SW' and e->>'to'='A07' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','A06'))||jsonb_build_array(jsonb_build_object('from','A06','dir','SW','to','A07'));
    elsif e->>'from'='A07' and e->>'dir'='NE' and e->>'to'='A05' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','A06'))||jsonb_build_array(jsonb_build_object('from','A06','dir','NE','to','A05'));
    elsif e->>'from'='C09' and e->>'dir'='SE' and e->>'to'='C12' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','C10'))||jsonb_build_array(jsonb_build_object('from','C10','dir','SE','to','C12'));
    elsif e->>'from'='C12' and e->>'dir'='NW' and e->>'to'='C09' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','C10'))||jsonb_build_array(jsonb_build_object('from','C10','dir','NW','to','C09'));
    elsif e->>'from'='C12' and e->>'dir'='S' and e->>'to'='C15' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','C14'))||jsonb_build_array(jsonb_build_object('from','C14','dir','S','to','C15'));
    elsif e->>'from'='C15' and e->>'dir'='N' and e->>'to'='C12' then
      out_items:=out_items||jsonb_build_array(e||jsonb_build_object('to','C14'))||jsonb_build_array(jsonb_build_object('from','C14','dir','N','to','C12'));
    elsif e->>'from'='A05' and e->>'dir'='E' and e->>'to'='A06' then e:=e||jsonb_build_object('dir','SW');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='A06' and e->>'dir'='W' and e->>'to'='A05' then e:=e||jsonb_build_object('dir','NE');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C09' and e->>'dir'='E' and e->>'to'='C10' then e:=e||jsonb_build_object('dir','SE');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C10' and e->>'dir'='W' and e->>'to'='C09' then e:=e||jsonb_build_object('dir','NW');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C12' and e->>'dir'='E' and e->>'to'='C14' then e:=e||jsonb_build_object('dir','S');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C14' and e->>'dir'='W' and e->>'to'='C12' then e:=e||jsonb_build_object('dir','N');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C14' and e->>'dir'='N' and e->>'to'='C26' then e:=e||jsonb_build_object('dir','NE');out_items:=out_items||jsonb_build_array(e);
    elsif e->>'from'='C26' and e->>'dir'='S' and e->>'to'='C14' then e:=e||jsonb_build_object('dir','SW');out_items:=out_items||jsonb_build_array(e);
    else out_items:=out_items||jsonb_build_array(e);
    end if;
  end loop;
  return out_items;
end;
$$;

create or replace function public._maze_path_visited_v1(p_visited jsonb,p_path jsonb,p_start text)
returns jsonb
language plpgsql
immutable
set search_path=''
as $$
declare
  e jsonb;
  id text;
  out_items jsonb := case when jsonb_typeof(p_visited)='array' then p_visited else jsonb_build_array(p_start) end;
begin
  for e in select value from jsonb_array_elements(coalesce(p_path,'[]'::jsonb)) loop
    foreach id in array array[e->>'from',e->>'to'] loop
      if id is not null and not out_items @> jsonb_build_array(id) then out_items:=out_items||jsonb_build_array(id); end if;
    end loop;
  end loop;
  return out_items;
end;
$$;

-- Upgrade any V1/old-V2 room state before replacing the graph. Legacy history is
-- both the old decision list and the old physical path, so the new story rooms
-- are inserted into pathHistory while decisionHistory keeps exactly 25 semantics.
with migrated as (
  select r.room_code,
         public._maze_canonical_decisions_v1(coalesce(r.state->'decisionHistory',r.state->'history','[]'::jsonb)) as decisions,
         public._maze_canonical_path_v1(coalesce(r.state->'pathHistory',r.state->'history','[]'::jsonb)) as path,
         coalesce((r.state->>'bandStep')::integer,(r.state->>'step')::integer,jsonb_array_length(coalesce(r.state->'decisionHistory',r.state->'history','[]'::jsonb))) as band_step,
         r.state
  from public.maze_rooms r
  where r.scenario_id='selem-01'
), completed as (
  select m.*,
         public._maze_path_visited_v1(m.state->'visited',m.path,'A01') as visited,
         case
           when m.state->>'partyFacing' in ('N','NE','E','SE','S','SW','W','NW') then m.state->>'partyFacing'
           when m.path->-1->>'dir' in ('N','NE','E','SE','S','SW','W','NW') then m.path->-1->>'dir'
           else 'N'
         end as party_facing
  from migrated m
)
update public.maze_rooms r
set state = c.state || jsonb_build_object(
      'bandStep',c.band_step,
      'step',c.band_step,
      'decisionHistory',c.decisions,
      'history',c.decisions,
      'pathHistory',c.path,
      'transit',coalesce(c.state->'transit','null'::jsonb),
      'visited',c.visited,
      'discovered',case when jsonb_typeof(c.state->'discovered')='array' then c.state->'discovered' else '[]'::jsonb end,
      'roomState',case when jsonb_typeof(c.state->'roomState')='object' then c.state->'roomState' else '{}'::jsonb end,
      'partyFacing',c.party_facing,
      'updated_at',to_jsonb(now())
    ),
    version=r.version+1,
    updated_at=now()
from completed c
where r.room_code=c.room_code;

-- Remove the old direct / side connections and their directed reverses.
delete from public.maze_edges where scenario_id='selem-01' and (
  (from_node='A05' and dir='E'  and to_node='A06') or
  (from_node='A06' and dir='W'  and to_node='A05') or
  (from_node='A05' and dir='SW' and to_node='A07') or
  (from_node='A07' and dir='NE' and to_node='A05') or
  (from_node='C09' and dir='E'  and to_node='C10') or
  (from_node='C10' and dir='W'  and to_node='C09') or
  (from_node='C09' and dir='SE' and to_node='C12') or
  (from_node='C12' and dir='NW' and to_node='C09') or
  (from_node='C12' and dir='E'  and to_node='C14') or
  (from_node='C14' and dir='W'  and to_node='C12') or
  (from_node='C12' and dir='S'  and to_node='C15') or
  (from_node='C15' and dir='N'  and to_node='C12') or
  (from_node='C14' and dir='N'  and to_node='C26') or
  (from_node='C26' and dir='S'  and to_node='C14')
);

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','A05','SW','A06'),
  ('selem-01','A06','NE','A05'),
  ('selem-01','A06','SW','A07'),
  ('selem-01','A07','NE','A06'),
  ('selem-01','C09','SE','C10'),
  ('selem-01','C10','NW','C09'),
  ('selem-01','C10','SE','C12'),
  ('selem-01','C12','NW','C10'),
  ('selem-01','C12','S','C14'),
  ('selem-01','C14','N','C12'),
  ('selem-01','C14','S','C15'),
  ('selem-01','C15','N','C14'),
  ('selem-01','C14','NE','C26'),
  ('selem-01','C26','SW','C14')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

-- The two inserted story rooms are physically traversed between band decisions.
delete from public.maze_forced_decision_nodes
where scenario_id='selem-01' and node_id in ('A06','C10');

drop function public._maze_path_visited_v1(jsonb,jsonb,text);
drop function public._maze_canonical_path_v1(jsonb);
drop function public._maze_canonical_decisions_v1(jsonb);
