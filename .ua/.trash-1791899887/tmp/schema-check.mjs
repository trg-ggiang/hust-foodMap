import fs from 'node:fs';
import { KnowledgeGraphSchema } from 'file:///C:/Users/Admin/.understand-anything/repo/understand-anything-plugin/packages/core/dist/index.js';
const g=JSON.parse(fs.readFileSync('D:/GR2/hust_foodmap/.ua/knowledge-graph.json','utf8'));
const result=KnowledgeGraphSchema.safeParse(g);
if(!result.success){console.error(JSON.stringify(result.error.issues,null,2));process.exit(1);}
console.log('KnowledgeGraphSchema: valid');
