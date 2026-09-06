let cached=null;

export async function loadSelemScenes(){
  if(cached)return cached;
  cached=(async()=>{
    const indexResponse=await fetch('./data/content/selem-scenes.json',{cache:'no-store'});
    if(!indexResponse.ok)throw new Error('Could not load Selem scene index.');
    const index=await indexResponse.json();
    const parts=await Promise.all((index.files||[]).map(async path=>{
      const response=await fetch(path,{cache:'no-store'});
      if(!response.ok)throw new Error(`Could not load Selem scene file ${path}.`);
      return response.json();
    }));
    const scenes={};
    for(const part of parts){
      for(const [nodeId,scene] of Object.entries(part.scenes||{})){
        if(scenes[nodeId])throw new Error(`Duplicate authored scene ${nodeId}.`);
        scenes[nodeId]={...scene,zone:part.zone||nodeId[0]};
      }
    }
    return {...index,scenes};
  })();
  return cached;
}

export function sceneForNode(sceneBook,nodeId){
  return sceneBook?.scenes?.[nodeId]||null;
}

export function randomPolicyLabel(policy){
  return ({authored_only:'nur authored',authored_priority:'authored im Vordergrund',ambient:'Ambient-/Pool-Inhalt erlaubt'})[policy]||policy||'—';
}
