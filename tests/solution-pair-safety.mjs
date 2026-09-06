import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';

const base=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps[0];
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const expanded=applyExpansion(base,expansion);
const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

function adjacency(map){
  const adj=new Map(map.nodes.map(n=>[n.id,new Set()]));
  for(const [a,d,b] of map.edges){adj.get(a)?.add(b);if(OPP[d])adj.get(b)?.add(a)}
  return adj;
}
function shortestStats(adj,start){
  const dist=new Map([[start,0]]),ways=new Map([[start,1]]),q=[start];
  for(let i=0;i<q.length;i++){
    const n=q[i],d=dist.get(n);
    for(const to of adj.get(n)||[]){
      if(!dist.has(to)){dist.set(to,d+1);ways.set(to,ways.get(n));q.push(to)}
      else if(dist.get(to)===d+1)ways.set(to,ways.get(to)+ways.get(n));
    }
  }
  return {dist,ways};
}
function solutionNodes(map){
  const dirAdj=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [a,d,b] of map.edges){dirAdj.get(a)[d]=b;if(OPP[d]&&!dirAdj.get(b)[OPP[d]])dirAdj.get(b)[OPP[d]]=a}
  const out=[map.start];let node=map.start;
  for(const d of map.solution){node=dirAdj.get(node)?.[d];assert.ok(node,`Broken solution at ${out.at(-1)}/${d}`);out.push(node)}
  return out;
}

const solution=solutionNodes(base),baseAdj=adjacency(base),expandedAdj=adjacency(expanded);
let checked=0;
for(let i=0;i<solution.length;i++){
  const baseStats=shortestStats(baseAdj,solution[i]),expandedStats=shortestStats(expandedAdj,solution[i]);
  for(let j=i+1;j<solution.length;j++){
    const target=solution[j],bd=baseStats.dist.get(target),ed=expandedStats.dist.get(target),bw=baseStats.ways.get(target),ew=expandedStats.ways.get(target);
    assert.equal(ed,bd,`Expansion changed shortest distance ${solution[i]} -> ${target}: ${bd} to ${ed}`);
    assert.ok(ew<=bw,`Expansion added an equal-length shortest detour ${solution[i]} -> ${target}: ${bw} to ${ew} shortest paths`);
    checked++;
  }
}
console.log(`solution-pair-safety: OK (${checked} solution-node pairs)`);
