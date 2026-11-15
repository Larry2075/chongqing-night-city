import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=new URL('../dist/',import.meta.url);
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const result=await build({
  absWorkingDir:root,
  entryPoints:{app:'src/app.js',style:'style.css'},
  outdir:'dist/assets',entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',
  bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022','safari16.4'],
  minify:true,charset:'utf8',metafile:true,legalComments:'linked',logLevel:'info'
});
const outputFor=entry=>Object.entries(result.metafile.outputs).find(([,value])=>value.entryPoint===entry)[0].replace(/^dist\//,'./');
let html=await readFile(new URL('../index.html',import.meta.url),'utf8');
html=html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/,'')
  .replace('./src/app.js',outputFor('src/app.js')).replace('./style.css',outputFor('style.css'));
await writeFile(new URL('index.html',out),html);
await writeFile(new URL('.nojekyll',out),'');
for(const file of ['data/building-coverage.svg','data/map-audit.svg','docs/waterfront-references.md','docs/landmark-references.md','docs/hongya-chaotian-reference.md','LICENSE.simcraft','THIRD_PARTY_NOTICES.md']){
  const target=new URL(file,out);
  await mkdir(new URL('.',target),{recursive:true});
  await cp(new URL('../'+file,import.meta.url),target);
}
await cp(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('LICENSE.three',out));
console.log('Static city ready in dist/; no local server or external CDN required.');
