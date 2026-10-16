import json,pathlib,math
root=pathlib.Path('D:/GR2/hust_foodmap'); ua=root/'.ua'; batches=json.loads((ua/'intermediate/batches.json').read_text(encoding='utf-8-sig'))['batches']
fs={
'food-image.tsx':'Renders responsive food photographs using optimized WebP variants for recognized local images.',
'primitives.tsx':'Provides accessible modal dialogs, restaurant facts and interactive sidebar cards for discovery.',
'discovery-map.tsx':'Manages the MapLibre map lifecycle, clustered photo markers, selection, viewport filtering and user location controls.',
'discovery-navigation.tsx':'Renders the HUST FoodMap brand and desktop navigation for discovery, saved places and meal plans.',
'food-map.tsx':'Coordinates the discovery interface, search filters, map selection, saved restaurants and local trial meal planning. Persists saved and planning state locally while keeping location in memory.',
'restaurant-markers.tsx':'Renders photo markers and expanded selected restaurant cards with consistent hover and search highlighting.',
'use-discovery-query.ts':'Synchronizes typed discovery state with browser history, validates URL restoration and debounces search updates without server refetching.',
'use-user-location.ts':'Watches browser geolocation with retry, cancellation and stale callback protection while retaining coordinates only in memory.',
'discovery-query.ts':'Defines and validates discovery query state, canonical URL serialization, restaurant filters and walking or meal duration estimates.',
'data.ts':'Supplies campus origins and Vietnamese currency, price, text normalization and meal duration utilities.',
'map-provider.ts':'Selects configured or OpenFreeMap styles with an illustrative offline fallback and applies a restrained dark map theme.',
'error.tsx':'Provides the discovery route error boundary with a retry action inside the shared catalog status shell.',
'loading.tsx':'Reuses the catalog loading component as the App Router pending route state.',
'page.tsx':'Loads the initial restaurant catalog on the server and passes its recoverable result to the client discovery boundary.',
'catalog-client.tsx':'Manages ready, loading and recoverable error catalog states with abortable browser retries before mounting discovery.',
'catalog-status.tsx':'Provides the common catalog status layout and accessible loading message.',
'api.ts':'Fetches the restaurant catalog through the same-origin API with timeout, cancellation and envelope validation.',
'restaurants.ts':'Caches server catalog requests using a private backend origin and returns null on unavailable or malformed responses.'}
ss={
'FoodImage':fs['food-image.tsx'],'Modal':'Wraps Radix Dialog with a title, optional description and close control.',
'RestaurantFacts':'Displays restaurant price range, rating, review count and walking duration.',
'RestaurantSidebarCard':'Displays a selectable restaurant card with saving, hover highlighting and estimated meal duration.',
'DiscoveryMap':fs['discovery-map.tsx'],'Brand':'Renders the linked HUST FoodMap logo and campus dining tagline.',
'DiscoveryHeader':'Renders navigation counts, theme toggle and local account action in the desktop header.',
'FoodMap':fs['food-map.tsx'],'Empty':'Renders a reusable empty state with icon, explanatory text and optional action.',
'searchResultHighlightState':'Prioritizes selected and hovered restaurant states before search match highlighting.',
'MapRestaurantMarker':'Renders an interactive food photo marker with price, rating and hover callbacks.',
'ActiveMapRestaurantMarker':'Renders the selected restaurant photo card with close and detail actions.',
'reducer':'Restores validated query snapshots or applies typed changes while selecting push or replace history intent.',
'useDiscoveryQuery':fs['use-discovery-query.ts'],'useUserLocation':fs['use-user-location.ts'],
'createDefaultDiscoveryQuery':'Creates a fresh default discovery state and independent filter object.',
'parseDiscoveryQuery':'Validates URL parameters against permitted values and known restaurant IDs before restoring discovery state.',
'serializeDiscoveryQuery':'Builds a canonical query string that omits default discovery values.',
'getActiveFilterCount':'Counts enabled budget, walking, duration, rating, opening, crowd and amenity filters.',
'getWalkingMinutes':'Estimates walking time from a current position using straight-line distance or adjusted sample walking times.',
'getMealMinutes':'Combines walking, waiting, dining and return estimates for a complete meal duration.',
'selectDiscoveryRestaurants':'Filters restaurants by saved state, food group, normalized search, budget, time, rating, amenities and viewport, then sorts results.',
'money':'Formats a numeric amount as Vietnamese dong with no fractional digits.',
'compactPrice':'Formats a price as a compact thousands value.',
'normalize':'Removes Vietnamese diacritics and lowercases text for matching.',
'mealTime':'Adds walking, waiting and dining durations for a meal estimate.',
'polygon':'Builds illustrative polygon features from local coordinate offsets.',
'getMapProvider':fs['map-provider.ts'],'applyDarkMapTheme':'Adjusts map layer colors and Vietnamese labels unless an illustrative or dedicated dark style is active.',
'DiscoveryError':fs['error.tsx'],'DiscoveryPage':fs['page.tsx'],'CatalogClient':fs['catalog-client.tsx'],
'CatalogStatus':'Wraps catalog loading and error content in the shared discovery status layout.',
'CatalogLoading':'Renders the catalog pending message within the shared status shell.',
'loadRestaurants':fs['api.ts']}
for idx in (1,2):
 b=next(x for x in batches if x['batchIndex']==idx); ex=json.loads((ua/f'tmp/ua-file-extract-results-{idx}.json').read_text(encoding='utf-8')); nodes=[];edges=[]
 def edge(s,t,k,w):
  if s!=t and not any(x['source']==s and x['target']==t and x['type']==k for x in edges):edges.append(dict(source=s,target=t,type=k,direction='forward',weight=w))
 for f in ex['results']:
  p=f['path']; name=pathlib.PurePosixPath(p).name; fid='file:'+p; tags=['component','discovery','presentation'] if p.endswith('tsx') else ['utility','discovery','state-management']; complexity='complex' if f['nonEmptyLines']>200 else 'moderate' if f['nonEmptyLines']>=50 else 'simple'
  nodes.append(dict(id=fid,type='file',name=name,filePath=p,summary=fs[name],tags=tags,complexity=complexity))
  exported={x['name'] for x in f.get('exports',[])}
  for fn in f.get('functions',[]):
   if fn['endLine']-fn['startLine']+1<10 and fn['name'] not in exported:continue
   n=fn['name']; nodes.append(dict(id=f'function:{p}:{n}',type='function',name=n,filePath=p,lineRange=[fn['startLine'],fn['endLine']],summary=ss[n],tags=tags,complexity='complex' if fn['endLine']-fn['startLine']>200 else 'moderate' if fn['endLine']-fn['startLine']>=50 else 'simple')); edge(fid,f'function:{p}:{n}','contains',1.0)
   if n in exported:edge(fid,f'function:{p}:{n}','exports',.8)
  for target in b['batchImportData'][p]:edge(fid,'file:'+target,'imports',.7)
 # Resolve extracted call graph against significant definitions and exact imported symbols.
 allnodes={n['id'] for n in nodes}; functions={}
 for n in nodes:
  if n['type']=='function':functions.setdefault(n['name'],[]).append(n)
 for f in ex['results']:
  for c in f.get('callGraph',[]):
   caller=f"function:{f['path']}:{c['caller']}"
   if caller not in allnodes: continue
   for target in functions.get(c['callee'],[]):
    if target['filePath']==f['path'] or target['filePath'] in b['batchImportData'][f['path']]:edge(caller,target['id'],'calls',.8)
 # Code-grounded component and dynamic dependencies not represented by the call extractor.
 def fn(name):return next(n['id'] for n in nodes if n['type']=='function' and n['name']==name)
 def render(parent,children):
  for child in children:edge(fn(parent),fn(child),'contains',1.0)
 if idx==1:
  render('RestaurantSidebarCard',['FoodImage','RestaurantFacts']);render('MapRestaurantMarker',['FoodImage']);render('ActiveMapRestaurantMarker',['FoodImage']);render('DiscoveryHeader',['Brand']);render('DiscoveryMap',['MapRestaurantMarker','ActiveMapRestaurantMarker']);render('FoodMap',['RestaurantSidebarCard','RestaurantFacts','Modal','DiscoveryHeader','DiscoveryMap','Empty','FoodImage'])
  for hook in ['useDiscoveryQuery','useUserLocation']:edge(fn('FoodMap'),'file:'+next(n['filePath'] for n in nodes if n['name']==hook),'depends_on',.6)
  edge('file:apps/web/src/features/discovery/components/food-map.tsx','file:apps/web/src/features/discovery/components/discovery-map.tsx','depends_on',.6)
 else:
  render('CatalogLoading',['CatalogStatus']);render('DiscoveryError',['CatalogStatus']);render('CatalogClient',['CatalogStatus','CatalogLoading']);render('DiscoveryPage',['CatalogClient'])
  edge(fn('CatalogClient'),'function:apps/web/src/features/discovery/components/food-map.tsx:FoodMap','contains',1.0)
  edge(fn('CatalogClient'),fn('loadRestaurants'),'calls',.8)
 # Every edge target is a known batch node or verified neighboring symbol/file; partition using the specified limits.
 parts=math.ceil(max(len(nodes)/60,len(edges)/120)); files=sorted(f['path'] for f in ex['results']); chunk=math.ceil(len(files)/parts)
 for k in range(parts):
  selected=set(files[k*chunk:(k+1)*chunk]); partnodes=[n for n in nodes if n['filePath'] in selected]; ids={n['id'] for n in partnodes}; fragment={'nodes':partnodes,'edges':[e for e in edges if e['source'] in ids]}; dest=ua/'intermediate'/ (f'batch-{idx}.json' if parts==1 else f'batch-{idx}-part-{k+1}.json'); dest.write_text(json.dumps(fragment,indent=2),encoding='utf-8')
 print(idx,len(nodes),len(edges),'parts',parts,'skipped',ex['filesSkipped'])

