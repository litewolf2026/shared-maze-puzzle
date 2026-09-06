const CODE_TO_TYPE=Object.freeze({
  '.':'floor',
  '=':'bridge',
  ',':'shallow_water',
  '~':'deep_water',
  'r':'rubble',
  '#':'blocked'
});

const WALKABLE=new Set(['floor','bridge','shallow_water','rubble']);

export function terrainRows(node){return Array.isArray(node?.terrain?.rows)?node.terrain.rows:null}

export function terrainTypeAt(node,x,y){
  const grid=node?.exploreGrid;
  if(!grid||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=grid.w||y>=grid.h)return 'blocked';
  const rows=terrainRows(node);if(!rows)return 'floor';
  const row=rows[y];if(typeof row!=='string'||row.length!==grid.w)return 'blocked';
  return CODE_TO_TYPE[row[x]]||'blocked';
}

export function terrainWalkable(node,x,y){return WALKABLE.has(terrainTypeAt(node,x,y))}

export function terrainLabel(type){return ({floor:'Boden',bridge:'Steg',shallow_water:'flaches Wasser',deep_water:'tiefes Wasser',rubble:'Schutt',blocked:'unpassierbar'})[type]||type}

function candidatesAround(cx,cy,w,h){
  const out=[];for(let radius=0;radius<Math.max(w,h);radius++)for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.max(Math.abs(x-cx),Math.abs(y-cy))===radius)out.push({x,y});return out
}

export function roomStartPosition(node){
  const grid=node?.exploreGrid;if(!grid)return null;
  const entry=node?.terrain?.entry;
  if(Number.isInteger(entry?.x)&&Number.isInteger(entry?.y)&&terrainWalkable(node,entry.x,entry.y))return {x:entry.x,y:entry.y};
  const cx=Math.floor(grid.w/2),cy=Math.floor(grid.h/2);
  for(const p of candidatesAround(cx,cy,grid.w,grid.h))if(terrainWalkable(node,p.x,p.y))return p;
  return {x:cx,y:cy};
}

export function validateRoomTerrain(node){
  const rows=terrainRows(node);if(!rows)return {ok:true};
  const grid=node?.exploreGrid;if(!grid)return {ok:false,error:'TERRAIN_WITHOUT_GRID'};
  if(rows.length!==grid.h)return {ok:false,error:'TERRAIN_HEIGHT_MISMATCH'};
  if(rows.some(row=>typeof row!=='string'||row.length!==grid.w))return {ok:false,error:'TERRAIN_WIDTH_MISMATCH'};
  for(const row of rows)for(const code of row)if(!CODE_TO_TYPE[code])return {ok:false,error:`UNKNOWN_TERRAIN_${code}`};
  const start=roomStartPosition(node);if(!start||!terrainWalkable(node,start.x,start.y))return {ok:false,error:'NO_WALKABLE_START'};
  return {ok:true};
}

export function terrainCounts(node){
  const grid=node?.exploreGrid;if(!grid)return {};
  const out={};for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++){const type=terrainTypeAt(node,x,y);out[type]=(out[type]||0)+1}return out
}
