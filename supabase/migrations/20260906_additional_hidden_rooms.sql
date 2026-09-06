-- Additional reusable secret rooms. The generic access table/functions were introduced
-- by 20260906_hidden_connections.sql; this migration only adds topology + unlock bindings.

insert into public.maze_edges(scenario_id,from_node,dir,to_node) values
  ('selem-01','A23','E','A31'),
  ('selem-01','A31','W','A23'),
  ('selem-01','B33','S','B35'),
  ('selem-01','B35','N','B33')
on conflict do nothing;

insert into public.maze_edge_requirements(
  scenario_id,from_node,dir,to_node,hidden,unlock_node_id,unlock_slot_id,required_states
) values
  ('selem-01','A23','E','A31',true,'A23','secret-pilgrim-room',array['opened','resolved']::text[]),
  ('selem-01','A31','W','A23',true,'A23','secret-pilgrim-room',array['opened','resolved']::text[]),
  ('selem-01','B33','S','B35',true,'B33','secret-maintenance-room',array['opened','resolved']::text[]),
  ('selem-01','B35','N','B33',true,'B33','secret-maintenance-room',array['opened','resolved']::text[])
on conflict (scenario_id,from_node,dir,to_node) do update set
  hidden=excluded.hidden,
  unlock_node_id=excluded.unlock_node_id,
  unlock_slot_id=excluded.unlock_slot_id,
  required_states=excluded.required_states;

-- B33 is already an authored room decision in the canonical decision table.
-- A23 deliberately remains non-decision: entering its branch consumed the decision at
-- A22, and discovering the hidden continuation does not spend a second band symbol.
-- A31/B35 are pure secret dead-end rooms and therefore are not forced decisions.
