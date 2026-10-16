import json,re
from pathlib import Path
root=Path('D:/GR2/hust_foodmap'); ua=root/'.ua'
batches=json.loads((ua/'intermediate/batches.json').read_text(encoding='utf-8-sig'))['batches']
summaries={
'.ua/.understandignore': 'Lists suggested ignore patterns for generated output, browser snapshots, vendor assets and tests; all suggested exclusions remain commented out.',
'.ua/config.json': 'Selects English output for the Understand Anything analysis.',
'restaurants.test.cjs': 'Runs Node integration tests against a compiled NestJS application, covering health, sample catalog envelopes, Vietnamese search, query validation, detail errors and menu-based food grouping.',
'next-env.d.ts': 'Generated Next.js type entry point referencing framework image types and generated route and root parameter declarations.',
'next.config.ts': 'Configures the Next.js workspace root and strict rendering, disables branding and development indicators, and proxies API requests to API_INTERNAL_URL or the local NestJS server.',
'postcss.config.mjs': 'Enables the Tailwind CSS PostCSS plugin for the web build.',
'maplibre-gl-worker.mjs': 'Copied MapLibre GL vendor worker bundle served from public assets to run map processing outside the UI thread. Minified third-party internals are intentionally omitted from the authored-code graph.',
'prepare-images.mjs': 'Generates 128, 256, 512 and 768 pixel WebP variants from public JPEG images using Sharp, quality 78 and no enlargement.',
'prepare-map-worker.mjs': 'Resolves the installed MapLibre GL worker module and copies it into public assets for browser loading.',
'food-map.css': 'Styles map-specific presentation including loading and error states, map overlays, restaurant pins and discovery layout refinements.',
'globals.css': 'Defines Tailwind integration, light and dark design tokens, application layout, discovery cards, dialogs and responsive interface styling.',
'layout.tsx': 'Provides the Vietnamese Next.js root document, site metadata and viewport configuration while loading typography, MapLibre and application styles.',
'contracts.ts': 'Re-exports shared restaurant contract types from the workspace contracts package for frontend consumers.',
'tsconfig.tsbuildinfo': 'Generated TypeScript incremental compilation cache storing compiler state rather than authored application behavior.',
'dark-map-checks.js': 'Browser regression script checking map and sidebar hover/selection synchronization, details, search, clustering, WCAG auditing and viewport overflow.',
'desktop-only.js': 'Checks side-by-side desktop layout across widths, absence of mobile UI, vegetarian selection and browser runtime errors.',
'dev-smoke.js': 'Smoke-checks the development stack health endpoint, default restaurant cards and map pins, then saves a screenshot.',
'edge-checks.js': 'Exercises denied GPS, expiring persisted visit plans, blocked map workers and responsive/theme controls, preserving discovery when map loading fails.',
'filter-edge-checks.js': 'Checks denied geolocation and retry, unlimited filter defaults, preview count agreement, reset state and quick-filter width.',
'filter-location-checks.js': 'Exercises permitted live geolocation, budget URL state, clearing filters while preserving search, updated walking estimates and accessibility diagnostics.',
'inspect-migration.js': 'Inspects selected-pin detail hit testing and sidebar geometry to diagnose interaction and scrolling issues.',
'laptop-fit.js': 'Checks header, sidebar, selected pin and filter dialog fit across laptop viewports with geolocation enabled, capturing diagnostic screenshots.',
'map-refresh-check.js': 'Checks that map pins remain available after a delayed wait and reports browser runtime errors.',
'migration-checks.js': 'Verifies API-driven discovery, outage and retry behavior, responsive WebP loading and backend restaurant names replacing frontend fixture content.'
}
for idx in (5,9,10):
 b=next(x for x in batches if x['batchIndex']==idx); nodes=[];edges=[]
 def edge(s,t,k,w): edges.append(dict(source=s,target=t,type=k,direction='forward',weight=w))
 for f in b['files']:
  p=f['path']; name=Path(p).name; typ='config' if f['fileCategory']=='config' else 'file'; tags=['configuration','build-system','web']; complexity='simple'
  if p.startswith('.playwright-cli/'):
   txt=(root/p).read_text(encoding='utf-8'); summary='Generated Playwright accessibility-tree snapshot of the HUST FoodMap discovery interface, including navigation, search and restaurant cards.'
   if 'dialog' in txt: summary+=' Captures the meal filter dialog state.'
   tags=['generated','browser-snapshot','testing'];complexity='moderate'
  elif name.endswith('.webp'):
   subject,width=re.match(r'(.*)-(\d+)\.webp',name).groups();summary=f'Generated {width} pixel target-width WebP variant for the {subject} food photograph, used as a responsive public image asset.';tags=['generated','image-asset','responsive-image']
  elif name.startswith('lighthouse'):
   report=json.loads((root/p).read_text(encoding='utf-8'));summary=f"Generated Lighthouse {report['lighthouseVersion']} audit report for {report['requestedUrl']}, containing performance, accessibility and page diagnostic results from {report['fetchTime']}.";tags=['generated','audit-report','performance'];complexity='complex'
  else:
   summary=summaries.get(p,summaries.get(name)); assert summary,p
   if p.startswith('output/playwright/') or name=='restaurants.test.cjs': tags=['test','browser-automation','regression'] if p.startswith('output/') else ['test','api','validation'];complexity='moderate' if f['sizeLines']>=25 else 'simple'
   elif name.endswith('.css'):tags=['stylesheet','theme','responsive-layout'];complexity='complex'
   elif name.endswith('.webp'):pass
   elif name=='maplibre-gl-worker.mjs':tags=['vendor','generated','map-worker'];complexity='complex'
   elif name.endswith('tsbuildinfo') or name=='next-env.d.ts':tags=['generated','typescript','build-system']
   elif name=='contracts.ts':tags=['barrel','type-definition','contracts']
   elif name=='layout.tsx':tags=['entry-point','component','metadata']
   elif name.startswith('prepare-'):tags=['build-system','asset-pipeline','script']
  nid=f'{typ}:{p}';nodes.append(dict(id=nid,type=typ,name=name,filePath=p,summary=summary,tags=tags,complexity=complexity))
  for target in b['batchImportData'][p]:edge(nid,'file:'+target,'imports',.7)
  if name=='layout.tsx':
   fn='function:'+p+':RootLayout';nodes.append(dict(id=fn,type='function',name='RootLayout',filePath=p,lineRange=[22,28],summary='Wraps application children in a Vietnamese HTML document and body.',tags=['component','entry-point','document'],complexity='simple'));edge(nid,fn,'contains',1);edge(nid,fn,'exports',.8)
 assert len(nodes)<=60 and len(edges)<=120
 ids={x['id'] for x in nodes};assert len(ids)==len(nodes)
 assert len([x for x in edges if x['type']=='imports'])==sum(len(v) for v in b['batchImportData'].values())
 for e in edges:assert e['source'] in ids and e['target'] in ids
 out=ua/f'intermediate/batch-{idx}.json';out.write_text(json.dumps(dict(nodes=nodes,edges=edges),ensure_ascii=False,indent=2),encoding='utf-8'); print(idx,len(nodes),len(edges))
