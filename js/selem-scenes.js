let cached=null;

async function loadJson(path,label){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw new Error(`Could not load ${label} ${path}.`);
  return response.json();
}

export async function loadSelemScenes(){
  if(cached)return cached;
  cached=(async()=>{
    const index=await loadJson('./data/content/selem-scenes.json','Selem scene index');
    const [parts,setpieceData,setpieceOverrideData]=await Promise.all([
      Promise.all((index.files||[]).map(path=>loadJson(path,'Selem scene file'))),
      index.setpiecesFile?loadJson(index.setpiecesFile,'Selem setpiece file'):Promise.resolve({setpieces:{}}),
      index.setpieceOverridesFile?loadJson(index.setpieceOverridesFile,'Selem setpiece overrides'):Promise.resolve({setpieces:{}})
    ]);
    const scenes={};
    for(const part of parts){
      for(const [nodeId,scene] of Object.entries(part.scenes||{})){
        if(scenes[nodeId])throw new Error(`Duplicate authored scene ${nodeId}.`);
        scenes[nodeId]={...scene,zone:part.zone||nodeId[0]};
      }
    }
    const setpieces=structuredClone(setpieceData.setpieces||{});
    for(const [nodeId,patch] of Object.entries(setpieceOverrideData.setpieces||{})){
      if(!setpieces[nodeId])throw new Error(`Setpiece override ${nodeId} has no base setpiece.`);
      setpieces[nodeId]={...setpieces[nodeId],...structuredClone(patch)};
    }
    for(const nodeId of Object.keys(setpieces))if(!scenes[nodeId])throw new Error(`Setpiece ${nodeId} has no authored scene.`);
    return {...index,scenes,setpieces};
  })();
  return cached;
}

export function sceneForNode(sceneBook,nodeId){return sceneBook?.scenes?.[nodeId]||null}
export function setpieceForNode(sceneBook,nodeId){return sceneBook?.setpieces?.[nodeId]||null}

export function randomPolicyLabel(policy){
  return ({authored_only:'nur authored',authored_priority:'authored im Vordergrund',ambient:'Ambient-/Pool-Inhalt erlaubt'})[policy]||policy||'—';
}
