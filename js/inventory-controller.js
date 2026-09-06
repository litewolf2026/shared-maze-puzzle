let last=null;
let activeKey=null;

function inventoryItems(detail){
  const state=detail?.state||{},map=detail?.map;
  const nodes=new Map((map?.nodes||[]).map(node=>[node.id,node]));
  const items=[];
  for(const [nodeId,room] of Object.entries(state.roomState||{})){
    for(const assignment of room?.content?.assignments||[]){
      if(assignment.type!=='loot'||assignment.state!=='taken')continue;
      items.push({
        key:`${nodeId}:${assignment.slotId}`,
        nodeId,
        roomLabel:nodes.get(nodeId)?.name||nodeId,
        label:assignment.label||assignment.contentId||'Fundstück',
        description:assignment.description||'',
        mechanics:assignment.mechanics||null
      });
    }
  }
  return items.sort((a,b)=>a.label.localeCompare(b.label,'de'));
}

function ensureInventory(){
  let bar=document.querySelector('#groupInventory');
  if(bar)return bar;
  const host=document.querySelector('.map-column');
  if(!host)return null;
  bar=document.createElement('section');bar.id='groupInventory';bar.className='inventory-bar';
  bar.innerHTML=`
    <button class="inventory-title" type="button" aria-expanded="true"><span>🎒 Gruppeninventar</span><b id="inventoryCount">0</b></button>
    <div class="inventory-items" id="inventoryItems"></div>
    <div class="inventory-detail" id="inventoryDetail" hidden></div>`;
  host.append(bar);
  const title=bar.querySelector('.inventory-title');
  const collapsed=localStorage.getItem('maze-inventory-collapsed')==='1';
  bar.classList.toggle('collapsed',collapsed);title.setAttribute('aria-expanded',String(!collapsed));
  title.addEventListener('click',()=>{
    const next=!bar.classList.contains('collapsed');
    bar.classList.toggle('collapsed',next);title.setAttribute('aria-expanded',String(!next));
    localStorage.setItem('maze-inventory-collapsed',next?'1':'0');
  });
  return bar;
}

function mechanicSummary(mechanics){
  if(!mechanics||typeof mechanics!=='object')return '';
  const parts=[];
  if(Number.isFinite(Number(mechanics.valueTier)))parts.push(`Wertstufe ${mechanics.valueTier}`);
  if(mechanics.category)parts.push(String(mechanics.category).replaceAll('_',' '));
  if(Array.isArray(mechanics.informationTags)&&mechanics.informationTags.length)parts.push(mechanics.informationTags.map(x=>String(x).replaceAll('_',' ')).join(', '));
  return parts.join(' · ');
}

function renderDetail(bar,item){
  const detail=bar.querySelector('#inventoryDetail');
  if(!item){detail.hidden=true;detail.innerHTML='';return}
  detail.hidden=false;detail.innerHTML='';
  const head=document.createElement('div');head.className='inventory-detail-head';
  const title=document.createElement('b');title.textContent=item.label;
  const room=document.createElement('span');room.textContent=`gefunden: ${item.roomLabel}`;head.append(title,room);detail.append(head);
  if(item.description){const p=document.createElement('p');p.textContent=item.description;detail.append(p)}
  const mechanics=mechanicSummary(item.mechanics);if(mechanics){const small=document.createElement('small');small.textContent=mechanics;detail.append(small)}
}

function render(){
  if(!last)return;
  const bar=ensureInventory();if(!bar)return;
  const items=inventoryItems(last),list=bar.querySelector('#inventoryItems'),count=bar.querySelector('#inventoryCount');
  count.textContent=String(items.length);list.innerHTML='';bar.classList.toggle('empty',items.length===0);
  if(!items.length){const empty=document.createElement('span');empty.className='inventory-empty';empty.textContent='noch leer';list.append(empty);activeKey=null;renderDetail(bar,null);return}
  if(activeKey&&!items.some(item=>item.key===activeKey))activeKey=null;
  for(const item of items){
    const button=document.createElement('button');button.type='button';button.className='inventory-chip';button.textContent=item.label;button.title=`${item.label} · gefunden in ${item.roomLabel}`;
    button.classList.toggle('active',item.key===activeKey);
    button.addEventListener('click',()=>{activeKey=activeKey===item.key?null:item.key;render()});
    list.append(button);
  }
  renderDetail(bar,items.find(item=>item.key===activeKey)||null);
}

window.addEventListener('maze-state',event=>{last=event.detail;render()});
if(window.MAZE_APP){last=window.MAZE_APP;render()}
