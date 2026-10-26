// Reuse the private app's in-memory dataset/profile: no clinical data in this bundle.
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
await build({entryPoints:['src/gate/parameter-pdf-entry.ts'],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2022',outfile:'dist-gate/parameter-pdf.js',define:{'process.env.NODE_ENV':'"production"','import.meta.url':'""'},plugins:[{
 name:'private-pdf-host',setup(b){
  b.onLoad({filter:/[/\\]data[/\\]lab-data\.json$/},()=>({contents:'export default window.__healthPdfHost.data',loader:'js'}))
  b.onLoad({filter:/[/\\]lib[/\\]patient\.ts$/},()=>({contents:'export const PATIENT=window.__healthPdfHost.patient',loader:'js'}))
  b.onResolve({filter:/\.woff\?url$/},args=>({path:resolve('node_modules',args.path.replace('?url','')),namespace:'pdf-font'}))
  b.onLoad({filter:/.*/,namespace:'pdf-font'},args=>({contents:`export default "data:font/woff;base64,${readFileSync(args.path).toString('base64')}"`,loader:'js'}))
 }
}]})
console.log('[pdf] bundled repaired parameter exporter with embedded Albert Sans')
