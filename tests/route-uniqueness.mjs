import fs from 'node:fs';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url))).maps;
const scenarios=JSON.parse(fs.readFileSync(new URL('../data/scenarios.json',import.meta.url))).scenarios;
const opp={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

function buildAdj(map){
  const adj=Object.fromEntries(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){
    adj[from][dir]=to;
    const reverse=opp[dir];
    if(reverse && !adj[to][reverse]) adj[to][reverse]=from;
  }
  return adj;
}

for(const scenario of scenarios){
  const map=maps.find(m=>m.id===scenario.map);
  if(!map) throw new Error(`${scenario.id}: missing map ${scenario.map}`);
  const adj=buildAdj(map);

  let node=map.start;
  for(const dir of map.solution){
    const next=adj[node]?.[dir];
    if(!next) throw new Error(`${scenario.id}: solution breaks at ${node} -> ${dir}`);
    node=next;
  }
  if(node!==map.goal) throw new Error(`${scenario.id}: solution ends at ${node}, not ${map.goal}`);

  const dist={[map.start]:0};
  const count={[map.start]:1};
  const queue=[map.start];
  for(let i=0;i<queue.length;i++){
    const current=queue[i];
    for(const next of Object.values(adj[current]||{})){
      const candidate=dist[current]+1;
      if(dist[next]===undefined){
        dist[next]=candidate;
        count[next]=count[current];
        queue.push(next);
      }else if(dist[next]===candidate){
        count[next]+=count[current];
      }
    }
  }

  if(dist[map.goal]!==map.solution.length){
    throw new Error(`${scenario.id}: shortcut detected; goal is reachable in ${dist[map.goal]} moves but band has ${map.solution.length} symbols`);
  }
  if(count[map.goal]!==1){
    throw new Error(`${scenario.id}: band route is not unique; ${count[map.goal]} shortest routes reach the goal in ${dist[map.goal]} moves`);
  }

  console.log(`${scenario.id}: unique shortest route OK (${map.solution.length} moves)`);
}
