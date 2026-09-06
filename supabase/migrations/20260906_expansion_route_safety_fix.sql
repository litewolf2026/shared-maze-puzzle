-- Replace an equal-length side route with a deliberately longer detour.
delete from public.maze_edges where scenario_id='selem-01' and from_node='B23' and dir='S' and to_node='B11';
delete from public.maze_edges where scenario_id='selem-01' and from_node='B11' and dir='N' and to_node='B23';

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','B23','NW','B24'),
  ('selem-01','B24','SE','B23')
on conflict(scenario_id,from_node,dir) do update set to_node=excluded.to_node;
