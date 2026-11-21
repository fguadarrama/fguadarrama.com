import{build}from'esbuild'
await build({entryPoints:['src/gate/weight-editorial-entry.tsx'],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2022',outfile:'dist-gate/weight-editorial.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',jsx:'automatic'})
console.log('[weight] bundled Spanish editorial weight + BMI fan, no private data')
