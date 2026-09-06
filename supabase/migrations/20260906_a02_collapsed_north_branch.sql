-- Restore A02 as a real Black Band decision node: east is the band route,
-- north is a short collapsed dead-end. A02 is already an authoritative
-- decision node; only the physical branch is added here.

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','A02','N','A32'),
  ('selem-01','A32','S','A02')
on conflict (scenario_id,from_node,dir) do update set to_node=excluded.to_node;
