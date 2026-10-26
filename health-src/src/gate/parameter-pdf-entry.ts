import { generateParameterReportBlob } from '../lib/pdf'
declare global { interface Window { __healthParameterPdf:(cid:string)=>Promise<Blob> } }
window.__healthParameterPdf=generateParameterReportBlob
