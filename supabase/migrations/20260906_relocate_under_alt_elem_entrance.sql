-- Relocate the optional entrance to Unter Alt-Elem away from Sahira's rooms.
-- The deep level remains optional and no canonical band step changes.

delete from public.maze_edges
where scenario_id='selem-01'
  and from_node='C14' and dir='DOWN' and to_node='D01';

delete from public.maze_edges
where scenario_id='selem-01'
  and from_node='D01' and dir='UP' and to_node='C14';

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','B14','DOWN','D01'),
  ('selem-01','D01','UP','B14')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;
