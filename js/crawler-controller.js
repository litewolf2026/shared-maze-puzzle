import {createCrawlerView,FACING_ORDER,rotateFacing} from './crawler-view.js';

const DIRS={N:{label:'12',opp:'S'},NE:{label:'½2',opp:'SW'},E:{label:'3',opp:'W'},SE:{label:'½5',opp:'NW'},S:{label:'6',opp:'N'},SW:{label:'½8',opp:'NE'},W:{label:'9',opp:'E'},NW:{label:'½11',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};

let map=null;
let facing=localStorage.getItem('maze-facing')||'N';
let crawler=null;

function currentNode(){
  if(!map)return null;
  const loc=document.querySelector('#loc');
  if(!loc)return null;
  const name=(loc.firstChild?.textContent||'').trim();
  const levelText=(loc.querySelector('small')?.textContent||'').split('·')[0].trim();
  const level=map.levels.find(l=>l.name===levelText);
  return map.nodes.find(n=>(level?Number(n.z)===Number(level.z):true)&&(n.name===name||n.gmName===name))||null;
}

function getState(){return {node:currentNode()?.id||map?.start,facing}}

function turn(steps){
  facing=rotateFacing(facing,steps);
  localStorage.setItem('maze-facing',facing);
  crawler?.render();
}

function clickDirection(dir){
  const selector=dir==='UP'||dir==='DOWN'?`.vertical button[data-d="${dir}"]`:`.dir[data-d="${dir}"]`;
  const button=document.querySelector(selector);
  if(!button||button.disabled)return false;
  button.click();
  return true;
}

function forward(){
  if(!FACING_ORDER.includes(facing))facing='N';
  clickDirection(facing);
}

function moveGmToggle(){
  const toggle=document.querySelector('#gmToggle');
  const bar=document.querySelector('.map-viewbar');
  if(toggle&&bar&&!bar.contains(toggle))bar.append(toggle);
}

async function init(){
  const [mapsRes,scenariosRes]=await Promise.all([fetch('./data/maps.json'),fetch('./data/scenarios.json')]);
  const maps=(await mapsRes.json()).maps||[];
  const scenarios=(await scenariosRes.json()).scenarios||[];
  const scenario=scenarios[0];
  map=maps.find(m=>m.id===scenario?.map)||maps[0];
  if(!map)return;
  if(!FACING_ORDER.includes(facing))facing='N';
  moveGmToggle();

  crawler=createCrawlerView({
    map,
    dirs:DIRS,
    getState,
    onTurn:turn,
    onForward:forward,
    onVertical:clickDirection
  });

  const loc=document.querySelector('#loc');
  if(loc)new MutationObserver(()=>crawler.render()).observe(loc,{childList:true,subtree:true,characterData:true});
  const history=document.querySelector('#history');
  if(history)new MutationObserver(()=>crawler.render()).observe(history,{childList:true,subtree:true});
  crawler.render();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
