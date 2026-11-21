import{generateWeightReportBlob}from'../lib/weight-pdf'
import type{WeightRecord}from'../data/weight-data'
declare global{interface Window{__healthWeightPdf?:(records:WeightRecord[],options?:{monochrome?:boolean;heightCm?:number;referenceWeight?:number})=>Promise<Blob>}}
window.__healthWeightPdf=(records,options={})=>generateWeightReportBlob(records,{heightCm:window.__healthWeightVizState?.heightCm,referenceWeight:window.__healthWeightVizState?.referenceWeight,...options})
