-- Make the canonical physical route pass through A06, C10 and C14 while
-- keeping the black band at exactly 25 decision departures.
-- A06 and C10 become authored transit rooms: entering/exiting them does not
-- consume another band symbol. C14 is reached only after decision 25, so its
-- later exits are post-band exploration choices.

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
