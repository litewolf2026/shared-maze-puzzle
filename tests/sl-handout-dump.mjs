import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const profiles=read('../data/content/profiles.json');
const slots=read('../data/content/selem-slots.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,derivedByNode,seed:slots.generation.seed});
const byId=new Map(map.nodes.map(n=>[n.id,n]));
console.log('SL_HANDOUT_DUMP_BEGIN');
for(const id of [...byId.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))){
  const node=byId.get(id); const room=plan.rooms[id];
  console.log(`ROOM|${id}|${node.name||''}|${node.gmName||''}|${node.z}|${node.kind||''}|${(node.tags||[]).join(',')}|${node.dangerFloor??''}`);
  for(const a of room?.assignments||[]){
    const m=a.mechanics?JSON.stringify(a.mechanics).replace(/\|/g,'/'):'-';
    const d=(a.description||'').replace(/\|/g,'/').replace(/\s+/g,' ').trim();
    console.log(`ITEM|${id}|${a.slotId}|${a.type}|${a.contentId}|${a.label||''}|${a.source||''}|${a.hidden?'hidden':'visible'}|${d}|${m}`);
  }
}
console.log('SL_HANDOUT_DUMP_END');
