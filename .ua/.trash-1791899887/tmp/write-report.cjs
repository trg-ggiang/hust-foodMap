const fs=require('fs');
const ua='D:/GR2/hust_foodmap/.ua/';
const g=JSON.parse(fs.readFileSync(ua+'knowledge-graph.json','utf8'));
const r=JSON.parse(fs.readFileSync(ua+'intermediate/review.json','utf8'));
const count=o=>Object.entries(o).map(([k,v])=>`${k}: ${v}`).join(', ');
fs.writeFileSync(ua+'analysis-summary.md',[
 '# HUST FoodMap architecture analysis','',
 g.project.description,'',
 `Analyzed ${g.project.analyzedAt}. All 115 scanned files represented.`,
 `File categories — ${count(r.stats.fileCategories)}.`,
 `Nodes — ${count(r.stats.nodeTypes)}.`,
 `Relationships — ${count(r.stats.edgeTypes)}.`,'',
 '## Architectural layers','',
 ...g.layers.map(l=>`- **${l.name}** (${l.nodeIds.length} files): ${l.description}`),'',
 `## Guided tour (${g.tour.length} steps)`,'',
 ...g.tour.map(t=>`${t.order}. **${t.title}** — ${t.description}`),'',
 '## Validation and limitations','',
 '- Full inventory coverage, unique IDs, valid edge/layer/tour references, and installed KnowledgeGraphSchema validation passed.',
 '- No Git repository was present. Commit hashes are empty; commit-based incremental update provenance is unavailable.',
 '- Ignore suggestions were retained as confirmed. Browser snapshots, generated WebP assets, vendor worker, historical verification scripts, reports, and compiler caches are included.',
 '- Structural parsing skipped 24 images, both stylesheets, two compiler caches, and the ignore file. All remain represented as file nodes with accurate role summaries.',
 '- The bundled vendor worker is represented as an asset; its 832 extracted minified functions were omitted.',
 '- Unavailable Swift/Kotlin/Scala/Dart grammars do not affect this project.',
 '- The cache-wrapped catalog loader was recovered from source during review. Workspace and dynamic-import relationships missed by the import parser are represented with source-backed semantic links.',
 `- ${r.warnings.length} isolated nodes remain; these primarily describe standalone configuration, generated assets, and historical artifacts.`,
 '- No application code changed. Application test/build suites were not run for this analysis-only task.',''
 ].join('\n'));
