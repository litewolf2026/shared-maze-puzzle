import fs from 'node:fs';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url))).maps;
const ciphers=JSON.parse(fs.readFileSync(new URL('../data/ciphers.json',import.meta.url))).ciphers;
const scenarios=JSON.parse(fs.readFileSync(new URL('../data/scenarios.json',import.meta.url))).scenarios;
const opp={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

function expectedDirection(a,b){
  if(a.z!==b.z){
    if(a.x!==b.x||a.y!==b.y) throw new Error(`vertical edge also moves horizontally: ${a.id} -> ${b.id}`);
    return b.z>a.z?'UP':'DOWN';
  }
  const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
  if(dx===0&&dy===-1)return 'N';
  if(dx===1&&dy===-1)return 'NE';
  if(dx===1&&dy===0)return 'E';
  if(dx===1&&dy===1)return 'SE';
  if(dx===0&&dy===1)return 'S';
  if(dx===-1&&dy===1)return 'SW';
  if(dx===-1&&dy===0)return 'W';
  if(dx===-1&&dy===-1)return 'NW';
  throw new Error(`zero-length edge: ${a.id} -> ${b.id}`);
}

for(const s of scenarios){
  const map=maps.find(m=>m.id===s.map),cipher=ciphers.find(c=>c.id===s.cipher);
  if(!map||!cipher)throw new Error(`${s.id}: missing map/cipher`);
  const byId=Object.fromEntries(map.nodes.map(n=>[n.id,n]));
  const seenOutgoing=new Map(),seenReverse=new Map();

  for(const [from,dir,to] of map.edges){
    const a=byId[from],b=byId[to];
    const expected=expectedDirection(a,b);
    if(dir!==expected)throw new Error(`${s.id}: ${from} -> ${to} is drawn ${expected}, encoded ${dir}`);
    const outKey=`${from}:${dir}`;
    if(seenOutgoing.has(outKey)&&seenOutgoing.get(outKey)!==to)throw new Error(`${s.id}: ambiguous outgoing ${outKey}`);
    seenOutgoing.set(outKey,to);
    const reverse=opp[dir];
    const revKey=`${to}:${reverse}`;
    if(seenReverse.has(revKey)&&seenReverse.get(revKey)!==from)throw new Error(`${s.id}: ambiguous reverse ${revKey}: ${seenReverse.get(revKey)} / ${from}`);
    seenReverse.set(revKey,from);
  }

  const symbolEntries=Object.entries(cipher.symbols||{});
  const signatures=new Map();
  for(const [dir,bits] of symbolEntries){
    if(!opp[dir])throw new Error(`${s.id}: unknown cipher direction ${dir}`);
    if(!Array.isArray(bits)||bits.length!==6||bits.some(x=>x!==0&&x!==1))throw new Error(`${s.id}: malformed six-dot symbol ${dir}`);
    const sig=bits.join('');
    if(signatures.has(sig))throw new Error(`${s.id}: duplicate cipher symbol ${dir} = ${signatures.get(sig)}`);
    signatures.set(sig,dir);
  }
  for(const dir of Object.keys(opp))if(!cipher.symbols?.[dir])throw new Error(`${s.id}: cipher missing ${dir}`);

  const adj=Object.fromEntries(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){adj[from][dir]=to;const reverse=opp[dir];if(!adj[to][reverse])adj[to][reverse]=from;}
  let node=map.start;
  const route=[];
  map.solution.forEach((dir,i)=>{const next=adj[node]?.[dir];if(!next)throw new Error(`${s.id}: band step ${i+1} ${dir} impossible from ${node}`);route.push(`${i+1}:${node}-${dir}->${next}`);node=next;});
  if(node!==map.goal)throw new Error(`${s.id}: band ends at ${node}, not ${map.goal}`);
  console.log(`${s.id}: direction geometry + 10 unique cipher symbols OK`);
  console.log(route.join(' | '));
}
