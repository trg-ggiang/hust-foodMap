const fs = require('fs');
const path = require('path');
const root = 'D:/GR2/hust_foodmap';
const ua = path.join(root, '.ua');
const read = p => JSON.parse(fs.readFileSync(path.join(ua,p),'utf8'));
const write = (p,v) => fs.writeFileSync(path.join(ua,p),JSON.stringify(v,null,2));
const scan=read('intermediate/scan-result.json');
const graph=read('intermediate/assembled-graph.json');
graph.version='1.0.0';
graph.project={name:scan.name,languages:scan.languages,frameworks:scan.frameworks,description:scan.description,analyzedAt:new Date().toISOString(),gitCommitHash:''};
let layers=read('intermediate/layers.json');
let tour=read('intermediate/tour.json');
graph.layers=Array.isArray(layers)?layers:layers.layers;
graph.tour=(Array.isArray(tour)?tour:tour.steps||tour.tour).sort((a,b)=>a.order-b.order);
const ids=new Set(graph.nodes.map(n=>n.id));
const issues=[],warnings=[];
const fileTypes=new Set(['file','config','document','service','pipeline','table','schema','resource','endpoint']);
const seen=new Set();
for(const n of graph.nodes){
  for(const k of ['id','type','name','summary']) if(!n[k]) issues.push(`${n.id} missing ${k}`);
  if(!n.tags?.length) issues.push(`${n.id} missing tags`);
  if(seen.has(n.id)) issues.push(`Duplicate ${n.id}`);
  seen.add(n.id);
  if(n.filePath && !fs.existsSync(path.join(root,n.filePath))) issues.push(`Missing file ${n.filePath}`);
}
for(const e of graph.edges){
  if(!ids.has(e.source)||!ids.has(e.target)) issues.push(`Dangling edge ${e.source} -> ${e.target}`);
  if(e.source===e.target) issues.push(`Self edge ${e.source}`);
}
const assigned=new Map();
for(const layer of graph.layers){
  for(const key of ['id','name','description','nodeIds']) if(!layer[key]) issues.push(`Layer missing ${key}`);
  for(const id of layer.nodeIds||[]){
    if(!ids.has(id)) issues.push(`Layer dangling ${id}`);
    if(assigned.has(id)) issues.push(`Multiple layers ${id}`);
    assigned.set(id,layer.id);
  }
}
for(const n of graph.nodes.filter(n=>fileTypes.has(n.type))) if(!assigned.has(n.id)) issues.push(`Unassigned ${n.id}`);
for(const step of graph.tour){
  for(const key of ['order','title','description','nodeIds']) if(step[key]===undefined) issues.push(`Tour missing ${key}`);
  for(const id of step.nodeIds||[]) if(!ids.has(id)) issues.push(`Tour dangling ${id}`);
}
for(const f of scan.files) if(!graph.nodes.some(n=>n.filePath===f.path&&fileTypes.has(n.type))) issues.push(`Inventory missing ${f.path}`);
const connected=new Set(graph.edges.flatMap(e=>[e.source,e.target]));
for(const n of graph.nodes) if(!connected.has(n.id)) warnings.push(`Orphan ${n.id}`);
const count=(items,key)=>items.reduce((a,x)=>(a[x[key]]=(a[x[key]]||0)+1,a),{});
const stats={totalNodes:graph.nodes.length,totalEdges:graph.edges.length,totalLayers:graph.layers.length,tourSteps:graph.tour.length,nodeTypes:count(graph.nodes,'type'),edgeTypes:count(graph.edges,'type'),fileCategories:count(scan.files,'fileCategory')};
write('intermediate/review.json',{issues,warnings,stats});
write('intermediate/assembled-graph.json',graph);
console.log(JSON.stringify({issues,warnings,stats},null,2));
if(issues.length) process.exit(1);
write('knowledge-graph.json',graph);
write('intermediate/fingerprint-input.json',{projectRoot:root,sourceFilePaths:scan.files.map(f=>f.path),gitCommitHash:''});
