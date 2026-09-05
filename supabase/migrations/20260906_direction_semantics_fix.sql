begin;

-- A10 -> A19 is drawn southwest, not south.
delete from public.maze_edges where scenario_id='selem-01' and (
  (from_node='A10' and dir='S' and to_node='A19') or
  (from_node='A19' and dir='N' and to_node='A10')
);
insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','A10','SW','A19'),
  ('selem-01','A19','NE','A10')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

-- B04 -> B08 is drawn straight south. This also frees B08/NW for B06.
delete from public.maze_edges where scenario_id='selem-01' and (
  (from_node='B04' and dir='SE' and to_node='B08') or
  (from_node='B08' and dir='NW' and to_node='B04')
);
insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','B04','S','B08'),
  ('selem-01','B08','N','B04'),
  ('selem-01','B08','NW','B06')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

-- C04 -> C08 is drawn straight south. This also frees C08/NW for C06.
delete from public.maze_edges where scenario_id='selem-01' and (
  (from_node='C04' and dir='SE' and to_node='C08') or
  (from_node='C08' and dir='NW' and to_node='C04')
);
insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','C04','S','C08'),
  ('selem-01','C08','N','C04'),
  ('selem-01','C08','NW','C06')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

-- C12 -> C14 is drawn east, not northeast.
delete from public.maze_edges where scenario_id='selem-01' and (
  (from_node='C12' and dir='NE' and to_node='C14') or
  (from_node='C14' and dir='SW' and to_node='C12')
);
insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','C12','E','C14'),
  ('selem-01','C14','W','C12')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;

commit;
