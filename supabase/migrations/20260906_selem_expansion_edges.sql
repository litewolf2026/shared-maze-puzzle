-- Additional optional exploration graph for selem-01.
-- The 25-step solution route is unchanged; these edges only add side areas and level D.
do $$
declare
  e jsonb;
  v_from text;
  v_dir text;
  v_to text;
  v_rev text;
begin
  for e in select value from jsonb_array_elements($edges$[
    ["A03","N","A21"],["A21","E","A22"],["A22","SE","A23"],
    ["A17","S","A24"],["A24","W","A25"],["A25","S","A26"],["A26","E","A27"],["A27","E","A28"],["A28","E","A29"],["A29","N","A18"],["A28","S","A30"],
    ["B02","N","B21"],["B21","E","B22"],["B22","S","B23"],["B23","S","B11"],["B03","N","B24"],
    ["B06","S","B25"],["B25","SW","B26"],["B26","W","B27"],["B27","S","B28"],["B28","E","B29"],["B29","NE","B30"],["B30","E","B14"],
    ["B13","S","B31"],["B31","SW","B32"],["B32","W","B33"],["B33","W","B34"],["B34","NW","B20"],
    ["C02","N","C16"],["C16","E","C17"],["C17","S","C18"],["C18","S","C11"],["C03","N","C19"],
    ["C06","S","C20"],["C20","SW","C21"],["C21","W","C22"],["C22","S","C23"],["C23","E","C24"],["C24","NE","C25"],["C25","E","C13"],
    ["C14","N","C26"],["C26","E","C27"],["C14","DOWN","D01"],
    ["D01","SW","D02"],["D02","W","D03"],["D03","S","D04"],["D04","E","D05"],["D05","E","D06"],["D06","N","D07"],["D07","E","D08"],["D08","S","D09"],["D09","SW","D10"],["D10","W","D11"],["D11","N","D12"],["D12","NE","D07"]
  ]$edges$::jsonb)
  loop
    v_from:=e->>0;v_dir:=e->>1;v_to:=e->>2;
    insert into public.maze_edges(scenario_id,from_node,dir,to_node)
      values('selem-01',v_from,v_dir,v_to)
      on conflict(scenario_id,from_node,dir) do update set to_node=excluded.to_node;
    v_rev:=case v_dir
      when 'N' then 'S' when 'NE' then 'SW' when 'E' then 'W' when 'SE' then 'NW'
      when 'S' then 'N' when 'SW' then 'NE' when 'W' then 'E' when 'NW' then 'SE'
      when 'UP' then 'DOWN' when 'DOWN' then 'UP' end;
    if v_rev is not null then
      insert into public.maze_edges(scenario_id,from_node,dir,to_node)
        values('selem-01',v_to,v_rev,v_from)
        on conflict(scenario_id,from_node,dir) do update set to_node=excluded.to_node;
    end if;
  end loop;
end $$;
