const fs=require('fs');
const root='D:/GR2/hust_foodmap', dir=root+'/.ua';
const batches=JSON.parse(fs.readFileSync(dir+'/intermediate/batches.json')).batches;
const descriptions={
'apps/api/src/restaurants/restaurant-query.dto.ts':'Validates restaurant list query strings, integer budget bounds, and optional open-status values using transformation and validation decorators.',
'apps/api/src/restaurants/restaurant.fixtures.ts':'Provides six illustrative restaurant listings with menu prices, sample ratings, coordinates, categories, amenities, and image references; these are unverified fixtures.',
'apps/api/src/restaurants/restaurants.controller.ts':'Exposes GET restaurant collection and ID routes, forwarding validated queries and identifiers to the restaurant service.',
'apps/api/src/restaurants/restaurants.module.ts':'Registers the restaurant controller and service in the NestJS dependency injection module.',
'apps/api/src/restaurants/restaurants.service.ts':'Filters sample restaurants by accent-insensitive text, shared food-group membership, budget, and open status. Returns sample data envelopes and raises a not-found error for missing identifiers.',
'apps/api/src/app.module.ts':'Composes the restaurant feature with a health controller reporting API status and sample data provenance.',
'apps/api/src/create-app.ts':'Creates the NestJS application with the /api prefix, configured CORS origins, strict transforming query validation, and shutdown hooks.',
'apps/api/src/main.ts':'Bootstraps the API on environment-controlled host and port, reporting startup failure through stderr and process exit status.',
'AGENTS.md':'Documents workspace architecture, server/client boundaries, sample data ownership, desktop layout expectations, and required development verification.',
'README.md':'Explains the Next.js/React and NestJS workspace architecture, local setup, build commands, restaurant endpoints, environment configuration, and sample-data limitations.',
'VERIFICATION.md':'Records current and historical browser, API, build, accessibility, layout, map, and food-group verification evidence with integration limitations.',
'package.json':'Defines the root npm workspaces, Node engine requirement, coordinated development/start commands, and workspace build, typecheck, and API test scripts.',
'apps/api/.env.example':'Lists sample API listener host/port and allowed development CORS origins.',
'apps/api/package.json':'Defines NestJS runtime dependencies and TypeScript build/watch scripts, including compiled HTTP tests executed by the Node test runner.',
'apps/api/tsconfig.json':'Configures strict ES2022 CommonJS compilation from src to dist, enabling decorators, emitted decorator metadata, and source maps.',
'apps/web/.env.example':'Documents public browser API/map settings and a separate private backend origin for server catalog loading and API rewrites.',
'apps/web/AGENTS.md':'Contains Next.js-generated guidance to consult bundled version-specific documentation and preserve the automatically maintained agent-rules block.',
'apps/web/package.json':'Declares Next.js, React, MapLibre, UI dependencies, and asset preparation before development/build; defines frontend serving and typechecking commands.',
'apps/web/tsconfig.json':'Configures strict no-emit frontend typechecking with Bundler resolution, React JSX, Next.js generated types, and the @/* source alias.',
'output/playwright/next-accessibility.js':'Historical browser verification callback auditing WCAG violations with axe, keyboard dialog closure, and selected-pin/mobile-sheet geometry; captures screenshots.',
'output/playwright/next-checks.js':'Historical browser regression callback checking category/pin synchronization, URL selection history, deep links, viewport overflow, cluster expansion, and empty search.',
'output/playwright/next-production.js':'Checks production-page availability, proxied restaurant catalog size, selection rendering, and browser errors on localhost:3001, saving a screenshot.',
'output/playwright/rice-filter-check.js':'Compares rice search and category results, verifies two map pins, and checks keyboard list scrolling and hidden list/dialog scrollbars.',
'output/playwright/rice-legacy-catalog.js':'Intercepts rendered HTML to remove secondary category metadata and verifies menu-based fallback still includes two rice restaurants.',
'output/playwright/semi-3d-checks.js':'Historical regression callback verifies photo-pin/sidebar hover and selection synchronization, filtering, clustering, detail dialogs, accessibility, and responsive overflow.',
'output/playwright/semi-3d-review.js':'Captures selected and default marker screenshots after image/animation completion and inspects reduced-motion styles.',
'output/playwright/sidebar-half.js':'Checks result-list height ratios, independent scrolling, crosshair cursors, and absent overflow across laptop viewports using a geolocation-enabled browser context.',
'output/playwright/verify.js':'Historical end-to-end browser callback tests filtering, sorting, trial accounts, local favorites, ratings, visit plans, accessibility, and mobile sheet controls.',
'output/playwright/zoom-diagnose.js':'Captures the zoomed-out map and reports photo-pin, cluster, and sidebar counts for diagnosing coverage.',
'output/playwright/zoom-verify.js':'Checks OpenFreeMap requests, cluster count and expansion, map-error visibility, attribution, and map screenshots at desktop/mobile sizes.',
'output/refactor-discovery.py':'One-off source transformation script moving discovery components into the feature directory and rewriting dynamic imports, navigation, accessibility, and shared-component references.',
'output/refine-styles.py':'One-off CSS transformation script replacing layout overrides with sidebar, marker, map, modal, responsive, and reduced-motion styling rules.',
'packages/contracts/food-groups.d.ts':'Declares the shared food-group matcher signature using restaurant category, secondary groups, and menu fields.',
'packages/contracts/food-groups.js':'Shares food-group membership logic between API and frontend: accent-normalized explicit groups and whole-phrase dish-name fallback handle combined categories.',
'packages/contracts/index.d.ts':'Declares shared restaurant and data-envelope contracts plus future visit-plan, realtime event, and service interfaces; declarations alone do not implement endpoints.',
'packages/contracts/package.json':'Declares the private shared contracts workspace and its index.d.ts type entry point.',
'tsconfig.tsbuildinfo':'Generated TypeScript incremental compilation cache recording compiler inputs and state; it contains no authored application behavior.'
};
const symbolSummaries={RestaurantQueryDto:'Defines optional validated search, category, budget, and open-only query fields.',RestaurantsController:'Delegates collection and restaurant-detail HTTP routes to the injected restaurant service.',RestaurantsModule:'Registers restaurant route handling and catalog service providers.',RestaurantsService:'Searches and filters restaurant fixtures and returns data envelopes with explicit sample provenance.',AppModule:'Composes restaurant routes and the API health controller.',createApp:'Builds the configured NestJS instance with API routing, CORS, validation, and lifecycle hooks.',matchesFoodGroup:'Matches normalized explicit food groups or complete dish-name phrases, including alternatives in combined categories.'};
const fileId=p=>{const f=JSON.parse(fs.readFileSync(dir+'/intermediate/scan-result.json')).files.find(x=>x.path===p);return (f?.fileCategory==='config'?'config':f?.fileCategory==='docs'?'document':'file')+':'+p;};
for(const index of [3,4,6,7,8,11]){
 const b=batches.find(x=>x.batchIndex===index), r=JSON.parse(fs.readFileSync(dir+'/tmp/ua-file-extract-results-'+index+'.json'));
 if(!r.scriptCompleted)throw Error('Extraction incomplete');
 const nodes=[],edges=[];
 const edge=(source,target,type,weight)=>edges.push({source,target,type,direction:'forward',weight});
 for(const f of b.files){
  const s=r.results.find(x=>x.path===f.path)||{}, id=fileId(f.path), type=id.split(':')[0];
  const tags=type==='config'?['configuration','build-system','workspace']:type==='document'?['documentation','architecture','development']:f.path.includes('playwright')?['test','browser','regression']:f.path.includes('contracts')?['data-model','shared-contract','utility']:f.path.endsWith('tsbuildinfo')?['generated','build-cache','typescript']:f.path.endsWith('.py')?['development','source-transformation','maintenance']:['api-handler','catalog','nestjs'];
  nodes.push({id,type,name:f.path.split('/').pop(),filePath:f.path,summary:descriptions[f.path],tags,complexity:(s.nonEmptyLines||0)>200?'complex':(s.nonEmptyLines||0)>=50?'moderate':'simple'});
  if(!descriptions[f.path])throw Error('Missing summary '+f.path);
  for(const target of b.batchImportData[f.path]||[])edge(id,'file:'+target,'imports',.7);
  for(const [kind,items] of [['function',s.functions||[]],['class',s.classes||[]]])for(const item of items){
   const exported=(s.exports||[]).some(e=>e.name===item.name)||(f.path==='packages/contracts/food-groups.js'&&item.name==='matchesFoodGroup');
   const length=item.endLine-item.startLine+1;
   if(!exported&&!(kind==='function'?length>=10:(item.methods||[]).length>=2||length>=20))continue;
   const sub=kind+':'+f.path+':'+item.name;
   nodes.push({id:sub,type:kind,name:item.name,filePath:f.path,lineRange:[item.startLine,item.endLine],summary:symbolSummaries[item.name],tags:kind==='class'?['nestjs','dependency-injection','api-handler']:['factory','validation','utility'],complexity:length>=50?'moderate':'simple'});
   if(!symbolSummaries[item.name])throw Error('Missing symbol summary '+item.name);
   edge(id,sub,'contains',1);if(exported)edge(id,sub,'exports',.8);
  }
 }
 const extra={
 3:[['class:apps/api/src/restaurants/restaurants.controller.ts:RestaurantsController','class:apps/api/src/restaurants/restaurants.service.ts:RestaurantsService','depends_on',.6],['file:apps/api/src/restaurants/restaurants.service.ts','function:packages/contracts/food-groups.js:matchesFoodGroup','calls',.8]],
 6:[['document:README.md',fileId('apps/api/src/main.ts'),'documents',.5],['document:README.md',fileId('apps/web/src/app/page.tsx'),'documents',.5],['config:package.json',fileId('apps/api/package.json'),'configures',.6],['config:package.json',fileId('apps/web/package.json'),'configures',.6],['document:VERIFICATION.md',fileId('packages/contracts/food-groups.js'),'documents',.5]],
 7:[['config:apps/api/.env.example',fileId('apps/api/src/main.ts'),'configures',.6],['config:apps/api/.env.example',fileId('apps/api/src/create-app.ts'),'configures',.6],['config:apps/api/tsconfig.json',fileId('apps/api/src/main.ts'),'configures',.6],['config:apps/api/package.json',fileId('apps/api/src/main.ts'),'configures',.6]],
 8:[['config:apps/web/tsconfig.json',fileId('apps/web/src/app/page.tsx'),'configures',.6],['config:apps/web/package.json',fileId('apps/web/src/app/page.tsx'),'configures',.6]],
 11:[['config:packages/contracts/package.json',fileId('packages/contracts/index.d.ts'),'configures',.6]]
 };
 for(const e of extra[index]||[])edge(...e);
 const expected=b.files.reduce((n,f)=>n+(b.batchImportData[f.path]||[]).length,0);if(edges.filter(e=>e.type==='imports').length!==expected)throw Error('Import mismatch');
 if(new Set(nodes.map(n=>n.id)).size!==nodes.length||nodes.some(n=>!n.summary)||edges.some(e=>e.source===e.target))throw Error('Invalid fragment');
 fs.writeFileSync(dir+'/intermediate/batch-'+index+'.json',JSON.stringify({nodes,edges},null,2));
 console.log(JSON.stringify({batch:index,nodes:nodes.length,edges:edges.length,filesSkipped:r.filesSkipped}));
}
