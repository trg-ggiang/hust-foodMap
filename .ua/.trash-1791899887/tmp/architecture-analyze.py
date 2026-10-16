import json,sys,posixpath
from collections import defaultdict,Counter
from pathlib import Path
def analyze(inp,out):
 d=json.loads(Path(inp).read_text(encoding='utf-8'));ns=d['fileNodes']; by={n['id']:n for n in ns}; paths=[n['filePath'] for n in ns]
 prefix=posixpath.commonpath(paths); prefix=prefix if all(p.startswith(prefix+'/') for p in paths) else ''
 groups=defaultdict(list);types=defaultdict(list);which={}
 for n in ns:
  p=n['filePath'][len(prefix)+1:] if prefix else n['filePath']; g=p.split('/')[0] if '/' in p else 'root'; groups[g].append(n['id']);which[n['id']]=g;types[n['type']].append(n['id'])
 fanin=Counter({i:0 for i in by});fanout=fanin.copy(); pairs=Counter();adj=defaultdict(list);categories=Counter();noncode=defaultdict(list)
 for e in d['importEdges']:
  a,b=e['source'],e['target'];fanin[b]+=1;fanout[a]+=1;adj[a].append(b);pairs[which[a],which[b]]+=1
 for e in d['allEdges']:
  a,b=by[e['source']],by[e['target']];categories[a['type'],b['type'],e['type']]+=1
  if a['type']!='file' and b['type']=='file': noncode[a['id']].append(b['id'])
 density={g:dict(internalEdges=pairs[g,g],totalEdges=sum(v for (a,b),v in pairs.items() if a==g or b==g)) for g in groups}
 for x in density.values():x['density']=x['internalEdges']/x['totalEdges'] if x['totalEdges'] else 0
 patterns={'api':'api','lib':'service','data':'data','components':'ui','utils':'utility','config':'config','test':'test','contracts':'types','hooks':'hooks','public':'assets','docs':'documentation','output':'test','.playwright-cli':'test','.ua':'config'}
 matches={p:patterns[p] for path in paths for p in path.split('/')[:-1] if p in patterns}
 docgroups={which[n['id']] for n in ns if n['type']=='document'}
 for e in d['allEdges']:
  if e['type']=='documents':docgroups.add(which[e['target']])
 infra=[p for p in paths if any(s in p for s in ('Dockerfile','docker-compose','.github/workflows','terraform','k8s/'))]
 result=dict(scriptCompleted=True,commonPrefix=prefix,directoryGroups=dict(groups),nodeTypeGroups=dict(types),importAdjacency=dict(adj),fileFanIn=dict(fanin),fileFanOut=dict(fanout),groupAdjacency={g:dict(importsFrom=sorted({b for a,b in pairs if a==g and b!=g}),importedBy=sorted({a for a,b in pairs if b==g and a!=g})) for g in groups},crossCategoryEdges=[dict(fromType=a,toType=b,edgeType=t,count=v) for (a,b,t),v in categories.items()],nonCodeConnections=dict(noncode),interGroupImports=[dict(**{'from':a,'to':b},count=v) for (a,b),v in pairs.items() if a!=b],intraGroupDensity=density,patternMatches=matches,deploymentTopology=dict(hasDockerfile=any('Dockerfile' in p for p in paths),hasCompose=any('docker-compose' in p for p in paths),hasK8s=any('k8s/' in p for p in paths),hasTerraform=any(p.endswith('.tf') for p in paths),hasCI=any('.github/workflows' in p for p in paths),infraFiles=infra),dataPipeline=dict(schemaFiles=[p for p in paths if p.endswith(('.sql','.graphql','.proto','.prisma'))],migrationFiles=[p for p in paths if 'migrations/' in p or p.endswith('.sql')],dataModelFiles=[n['filePath'] for n in ns if 'data-model' in n.get('tags',[])],apiHandlerFiles=[n['filePath'] for n in ns if 'api-handler' in n.get('tags',[])]),docCoverage=dict(groupsWithDocs=len(docgroups),totalGroups=len(groups),coverageRatio=len(docgroups)/len(groups),undocumentedGroups=sorted(set(groups)-docgroups)),dependencyDirection=[dict(dependent=a,dependsOn=b) for (a,b),v in pairs.items() if a!=b and v>pairs[b,a]],fileStats=dict(totalFileNodes=len(ns),filesPerGroup={g:len(v) for g,v in groups.items()},nodeTypeCounts={t:len(v) for t,v in types.items()}))
 Path(out).write_text(json.dumps(result,indent=2),encoding='utf-8')
if __name__=='__main__':
 try:analyze(sys.argv[1],sys.argv[2])
 except Exception as e:print(e,file=sys.stderr);sys.exit(1)
