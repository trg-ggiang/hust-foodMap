import json,pathlib,sys,collections,math
try:
 a=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8-sig'));nodes=a['nodes'];edges=a['edges'];idx={n['id']:n for n in nodes};ins={i:set() for i in idx};outs={i:set() for i in idx};deps={i:set() for i in idx}
 for e in edges:
  if e['source'] in idx and e['target'] in idx:
   outs[e['source']].add(e['target']);ins[e['target']].add(e['source'])
   if e['type'] in ('imports','calls'):deps[e['source']].add(e['target'])
 ranks=lambda d,k:[{'id':i,k:len(v),'name':idx[i]['name']} for i,v in sorted(d.items(),key=lambda z:(-len(z[1]),z[0]))[:20]]
 high=sorted([len(x) for x in outs.values()])[math.floor(len(idx)*.9)];low=sorted([len(x) for x in ins.values()])[math.floor(len(idx)*.25)]
 names=set('index.ts index.js main.ts main.js app.ts app.js server.ts server.js mod.rs main.go main.py main.rs manage.py app.py wsgi.py asgi.py run.py __main__.py Application.java Main.java Program.cs config.ru index.php App.swift Application.kt main.cpp main.c'.split()); candidates=[]
 for n in nodes:
  path=n.get('filePath','');score=0
  if n['type']=='file':score=3*(n['name'] in names)+int(path.count('/')<=1)+int(len(outs[n['id']])>=high)+int(len(ins[n['id']])<=low)
  elif n['type']=='document':score=5 if path=='README.md' else 2 if '/' not in path else 0
  if score:candidates.append(dict(id=n['id'],score=score,name=n['name'],summary=n['summary']))
 candidates.sort(key=lambda n:(-n['score'],n['id']));start=next((c['id'] for c in candidates if idx[c['id']]['type']=='file'),None);depth={start:0} if start else {};order=list(depth);q=collections.deque(order)
 while q:
  i=q.popleft()
  for j in sorted(deps[i]):
   if j not in depth:depth[j]=depth[i]+1;order.append(j);q.append(j)
 clusters=[];seen=set()
 for i in deps:
  for j in deps[i]:
   if i in deps[j] and tuple(sorted((i,j))) not in seen:
    cluster={i,j}
    for k in idx:
     if len(cluster)>=5:break
     if k not in cluster and sum(k in outs[x] or x in outs[k] for x in cluster)>=2:cluster.add(k)
    key=tuple(sorted(cluster));seen.add(tuple(sorted((i,j))));clusters.append({'nodes':list(key),'edgeCount':sum(len(outs[x]&cluster) for x in cluster)})
 inventory={};types={'documentation':['document'],'infrastructure':['service','pipeline','resource'],'data':['table','schema','endpoint'],'config':['config']}
 for k,ts in types.items():inventory[k]=[{f:n[f] for f in ('id','name','type','summary')} for n in nodes if n['type'] in ts]
 result=dict(scriptCompleted=True,entryPointCandidates=candidates[:5],fanInRanking=ranks(ins,'fanIn'),fanOutRanking=ranks(outs,'fanOut'),bfsTraversal=dict(startNode=start,order=order,depthMap=depth,byDepth={str(d):[i for i in order if depth[i]==d] for d in sorted(set(depth.values()))}),nonCodeFiles=inventory,clusters=sorted(clusters,key=lambda c:-c['edgeCount'])[:10],layers={'count':len(a['layers']),'list':[{k:l[k] for k in ('id','name','description')} for l in a['layers']]},nodeSummaryIndex={n['id']:{k:n[k] for k in ('summary','type','name')} for n in nodes},totalNodes=len(nodes),totalEdges=len(edges))
 pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2),encoding='utf-8')
except Exception as e:print(e,file=sys.stderr);sys.exit(1)
