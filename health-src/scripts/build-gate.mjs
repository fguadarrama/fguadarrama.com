import { build } from 'esbuild'
await build({entryPoints:['src/gate/main.tsx'],bundle:true,minify:true,format:'iife',target:'es2022',outfile:'dist-gate/one-time-code.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline'})
console.log('[gate] bundled OneTimeCode and local CSS')

await build({entryPoints:['src/gate/chart-hover-entry.ts'],bundle:true,minify:true,format:'iife',target:'es2022',outfile:'dist-gate/chart-hover.js',legalComments:'inline'})
