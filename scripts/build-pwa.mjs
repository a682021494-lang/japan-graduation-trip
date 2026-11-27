import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';

const html=await readFile('dist/index.html','utf8');
const entry=[...html.matchAll(/(?:src|href)="((?:app|style)\.[a-z]+[^"]*)"/g)].map(match=>'/'+match[1]);
const shell=['/',...entry,'/pwa.js','/map-gestures.js','/attraction-gallery.js','/data/attraction-photos.js','/data/reviewed-attraction-photos.js','/logic.js','/geography.js','/cloud-ui.js','/cloud-model.js','/cloud.js',
  '/cloud-config.js','/data/trip-images.js','/data/trips.json','/data/winter.js','/data/areas/prefectures.json','/maps/prefectures.json',
  '/fonts.css','/fonts/noto-sans-kr.woff','/manifest.webmanifest','/icons/japan-180.png','/icons/japan-192.png','/icons/japan-512.png'];
const source=await readFile('src/service-worker.js','utf8');
const hash=createHash('sha256').update(source);
for(const path of [...new Set([...shell.map(url=>url==='/'?'/index.html':url.split('?')[0]),
  ...(await readdir('dist/data/areas')).sort().map(file=>'/data/areas/'+file),
  ...(await readdir('dist/images',{recursive:true})).filter(file=>/\.(?:svg|webp)$/.test(file)).sort().map(file=>'/images/'+file)])]){
  hash.update(path).update(await readFile('dist'+path));
}
await writeFile('dist/sw.js',source.replace('__PUBLIC_REVISION__',JSON.stringify(hash.digest('hex').slice(0,20))).replace('__PUBLIC_SHELL__',JSON.stringify(shell)));
