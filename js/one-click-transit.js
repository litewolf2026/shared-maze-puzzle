let pending=null;

function liveRoom(){
  const cfg=window.MAZE_CONFIG||{};
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  return Boolean(cfg.supabaseUrl&&cfg.supabaseKey&&hash.get('room')&&hash.get('token'));
}

function clearPending(token){if(pending===token)pending=null}

function captureDirection(event){
  const button=event.target.closest?.('.dir,.vertical button[data-d]');
  if(!button||button.disabled||!button.dataset.d)return;
  const app=window.MAZE_APP;
  if(!app?.state||app.state.transit)return;
  const token={dir:button.dataset.d,from:app.state.node,seen:0,live:liveRoom()};
  pending=token;
  setTimeout(()=>clearPending(token),6000);
}

document.addEventListener('click',captureDirection,true);

window.addEventListener('maze-state',event=>{
  if(!pending)return;
  const state=event.detail?.state;
  if(!state)return;
  if(!state.transit){if(pending.seen>0)pending=null;return}
  if(state.transit.from!==pending.from||state.transit.dir!==pending.dir)return;
  pending.seen+=1;
  const needed=pending.live?2:1;
  if(pending.seen<needed)return;
  const token=pending;pending=null;
  queueMicrotask(()=>{
    const current=window.MAZE_APP?.state;
    if(current?.transit?.from===token.from&&current.transit.dir===token.dir){
      document.querySelector('#continueTransit')?.click();
    }
  });
});

window.addEventListener('hashchange',()=>{pending=null});
