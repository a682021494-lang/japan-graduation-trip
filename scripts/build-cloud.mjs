import { build } from 'esbuild';

await build({
  entryPoints:['src/cloud-sdk.js'],
  outfile:'dist/cloud-sdk.js',
  bundle:true,
  minify:true,
  legalComments:'eof',
  format:'esm',
  target:'es2022'
});
