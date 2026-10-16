const fs=require('fs');
const p='D:/GR2/hust_foodmap/.ua/intermediate/assembled-graph.json';
const g=JSON.parse(fs.readFileSync(p,'utf8'));
const file=p=>g.nodes.find(n=>n.filePath===p&&!['function','class'].includes(n.type))?.id;
let added=0;
const add=(a,b,type,weight)=>{const source=file(a),target=file(b);if(source&&target&&!g.edges.some(e=>e.source===source&&e.target===target&&e.type===type)){g.edges.push({source,target,type,direction:'forward',weight});added++;}};
add('apps/web/next.config.ts','apps/web/src/lib/api.ts','configures',.6);
add('apps/web/next.config.ts','apps/api/src/create-app.ts','routes',.5);
add('apps/web/.env.example','apps/web/src/lib/server/restaurants.ts','configures',.6);
add('apps/web/.env.example','apps/web/next.config.ts','configures',.6);
add('apps/web/postcss.config.mjs','apps/web/src/app/globals.css','configures',.6);
add('apps/web/src/features/discovery/components/discovery-map.tsx','apps/web/public/maplibre-gl-worker.mjs','depends_on',.6);
for(const s of ['prepare-images.mjs','prepare-map-worker.mjs']) add('apps/web/package.json',`apps/web/scripts/${s}`,'triggers',.6);
add('apps/web/scripts/prepare-map-worker.mjs','apps/web/public/maplibre-gl-worker.mjs','writes_to',.5);
for(const n of g.nodes.filter(n=>n.filePath?.endsWith('.webp'))){
 add('apps/web/scripts/prepare-images.mjs',n.filePath,'writes_to',.5);
 add('apps/web/src/components/food-image.tsx',n.filePath,'reads_from',.5);
}
add('packages/contracts/food-groups.d.ts','packages/contracts/food-groups.js','related',.5);
fs.writeFileSync(p,JSON.stringify(g,null,2));
console.log(`Added ${added} source-backed asset/config relationships`);
