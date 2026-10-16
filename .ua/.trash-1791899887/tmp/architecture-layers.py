import json
from pathlib import Path
base=Path('D:/GR2/hust_foodmap/.ua');g=json.loads((base/'intermediate/assembled-graph.json').read_text(encoding='utf-8-sig'))
types={'file','config','document','service','pipeline','table','schema','resource','endpoint'}
ns=[n for n in g['nodes'] if n['type'] in types and n.get('filePath') and not n.get('lineRange')];ids={n['id'] for n in ns}
es=[e for e in g['edges'] if e['source'] in ids and e['target'] in ids]
(base/'tmp/architecture-input.json').write_text(json.dumps(dict(fileNodes=ns,importEdges=[e for e in es if e['type']=='imports'],allEdges=es),indent=2),encoding='utf-8')
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('arch',str(base/'tmp/architecture-analyze.py')).load_module();m.analyze(str(base/'tmp/architecture-input.json'),str(base/'tmp/architecture-results.json'))
defs=[('web-entry','Next.js Routes And Catalog Loading','Next.js document and route states coordinate initial server catalog loading and recoverable client retries.'),('discovery','Discovery And Client Map','React discovery components, query and geolocation hooks, map rendering and styles support filtering, selection and local trial planning.'),('api','NestJS Sample Catalog API','NestJS bootstrap, validation, controllers, services and fixtures expose health and restaurant discovery backed by illustrative sample records.'),('contracts','Shared Restaurant Contracts','Workspace declarations and food-group matching define the restaurant envelopes and shared category semantics used by the API and frontend.'),('tooling','Project Tooling And Documentation','Workspace manifests, environment and compiler configuration, build preparation and project guides support development and analysis.'),('assets','Generated Runtime Assets','Responsive food images and the copied MapLibre worker are public runtime assets; generated declarations and compiler caches support builds.'),('verification','Verification And Historical Artifacts','API tests, browser regression and diagnostic scripts, Lighthouse reports, snapshots and one-off transformation scripts record validation and migration work.')]
layers={k:dict(id='layer:'+k,name=n,description=d,nodeIds=[]) for k,n,d in defs}
for n in ns:
 p=n['filePath'];name=Path(p).name
 if p.startswith(('output/','.playwright-cli/')) or '/test/' in p:k='verification'
 elif '/public/' in p or name in ('next-env.d.ts','tsconfig.tsbuildinfo'):k='assets'
 elif n['type'] in ('config','document') or p.startswith('.ua/') or '/scripts/' in p or name in ('next.config.ts','postcss.config.mjs'):k='tooling'
 elif p.startswith('packages/contracts/') or p=='apps/web/src/lib/contracts.ts':k='contracts'
 elif p.startswith('apps/api/src/'):k='api'
 elif p.startswith('apps/web/src/app/') and not p.endswith('.css') or p in ('apps/web/src/lib/server/restaurants.ts','apps/web/src/lib/api.ts') or name in ('catalog-client.tsx','catalog-status.tsx'):k='web-entry'
 else:assert p.startswith('apps/web/src/'),p;k='discovery'
 layers[k]['nodeIds'].append(n['id'])
out=list(layers.values());assigned=[i for x in out for i in x['nodeIds']];assert len(assigned)==len(ids)==len(set(assigned));assert set(assigned)==ids;assert all(x['nodeIds'] for x in out)
(base/'intermediate/layers.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print([(x['name'],len(x['nodeIds'])) for x in out]);print('Total:',len(assigned),'file-level nodes; edges:',len(es))
