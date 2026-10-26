import {mkdir,writeFile} from 'node:fs/promises'
import {createServer} from 'vite'
import assert from 'node:assert/strict'
process.env.VITE_PATIENT_FULL_NAME='Perfil de prueba'
process.env.VITE_PATIENT_DOB='1990-01-01'
process.env.VITE_PATIENT_CURP='Prueba local'
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'})
try{
 const {data}=await server.ssrLoadModule('/src/lib/data.ts')
 const {generateParameterReportBlob}=await server.ssrLoadModule('/src/lib/pdf.tsx')
 await mkdir('tmp/pdfs/parameters',{recursive:true})
 const manifest=[]
 for(const p of data.parameters){
  const bytes=Buffer.from(await(await generateParameterReportBlob(p.canonical_id)).arrayBuffer())
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-')
  const file=`tmp/pdfs/parameters/${p.canonical_id.replace(/[^a-z0-9_-]/gi,'_')}.pdf`
  await writeFile(file,bytes,{mode:0o600});manifest.push({id:p.canonical_id,file,results:data.byCanonical[p.canonical_id]?.length||0})
  if(manifest.length%25===0)console.log('Rendered',manifest.length,'/',data.parameters.length)
 }
 await assert.rejects(()=>generateParameterReportBlob('__missing__'))
 await writeFile('tmp/pdfs/parameters/manifest.json',JSON.stringify(manifest),{mode:0o600})
 console.log('PASS:',manifest.length,'parameter PDFs rendered; unknown IDs rejected.')
}finally{await server.close()}
