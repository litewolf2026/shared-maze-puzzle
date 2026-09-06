-- Add the optional drowned-pillars cavern as a dead-end branch below Alt-Elem.
-- This is additive only: it does not reinterpret any existing path, band step
-- or persisted room state.
insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','D09','E','D14'),
  ('selem-01','D14','W','D09')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;
