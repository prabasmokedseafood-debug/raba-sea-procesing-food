const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');
const jsonFiles=['data/translations.json','data/products.json','data/recipes.json','data/articles.json','data/references.json','data/industry-data.json','sources/source-registry.json','sources/image-sources.json','sources/data-sources.json','sources/standard-sources.json','sources/recipe-sources.json','sources/company-sources.json'];
let ok=true;
const seenByFile={};
for(const file of jsonFiles){try{const obj=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));console.log('JSON VALID',file);const walk=(v,depth=0)=>{if(Array.isArray(v))return v.forEach(x=>walk(x,depth));if(v&&typeof v==='object'){if(depth===1&&typeof v.id==='string'){const list=seenByFile[file]||(seenByFile[file]=new Set());if(list.has(v.id)){console.error('DUPLICATE ID',v.id,'in',file);ok=false}else list.add(v.id)}Object.values(v).forEach(x=>walk(x,depth+1))}};walk(obj);}catch(e){console.error('JSON ERROR',file,e.message);ok=false;}}
const sourceIds=new Set();try{const s=JSON.parse(fs.readFileSync(path.join(root,'sources/source-registry.json')));(s.sources||[]).forEach(x=>sourceIds.add(x.id));}catch{}
for(const file of ['data/products.json','data/recipes.json','data/articles.json','data/references.json','data/industry-data.json']){const obj=JSON.parse(fs.readFileSync(path.join(root,file)));const key=Object.keys(obj)[0];for(const row of obj[key]||[]){for(const sid of row.sourceIds||[]){if(!sourceIds.has(sid)){console.error('MISSING SOURCE',sid,'referenced by',row.id);ok=false;}}}}
console.log(ok?'DATA VALIDATION PASSED':'DATA VALIDATION FAILED');process.exit(ok?0:1);
