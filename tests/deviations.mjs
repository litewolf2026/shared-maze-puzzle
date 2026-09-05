import fs from 'node:fs';
const m=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url))).maps[0];
const opp={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE'};
const adj={};for(const n of m.nodes)adj[n.id]={};
for(const [a,d,b] of m.edges){adj[a][d]=b;if(!['UP','DOWN'].includes(d)&&!adj[b][opp[d]])adj[b][opp[d]]=a;}
let cur=m.start,checked=0;
for(let i=0;i<m.solution.length;i++){
  const correct=m.solution[i];
  for(const alt of Object.keys(adj[cur]).filter(d=>d!==correct)){
    checked++;let c=adj[cur][alt],possible=true;
    for(let j=i+1;j<m.solution.length;j++){const d=m.solution[j];if(!adj[c][d]){possible=false;break;}c=adj[c][d];}
    if(possible&&c===m.goal) throw new Error(`Wrong turn ${i+1}/${alt} still reaches goal`);
  }
  cur=adj[cur][correct];
}
console.log(`${checked} single-turn deviations checked; none can accidentally solve the puzzle.`);
