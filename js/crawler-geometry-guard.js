import {renderGeometryOverlay} from './crawler-geometry-overlay.js?v=20260906-geometry1';

let latest=null;
let scheduled=false;

function scheduleOverlay(){
  if(scheduled||!latest)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    if(!latest)return;
    renderGeometryOverlay(latest);
  });
}

window.addEventListener('maze-state',event=>{
  const detail=event.detail||{};
  if(detail.map&&detail.state){latest={map:detail.map,state:detail.state};scheduleOverlay()}
});

const svg=document.querySelector('#crawlerSvg');
if(svg){
  const observer=new MutationObserver(records=>{
    if(!latest)return;
    const meaningful=records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>!(node.nodeType===1&&node.classList?.contains('v31-geometry-overlay'))));
    if(meaningful)scheduleOverlay();
  });
  observer.observe(svg,{childList:true,subtree:false});
}

if(window.MAZE_APP?.map&&window.MAZE_APP?.state){latest={map:window.MAZE_APP.map,state:window.MAZE_APP.state};scheduleOverlay()}
