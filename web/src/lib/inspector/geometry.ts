export const INSPECTOR_SEPARATION=8;
export type InspectorMode='docked'|'overlay'|'fullscreen';
export function inspectorWidth(value:number):number {return Math.max(360,Math.min(640,Number.isFinite(value)?value:440));}
export function inspectorMode(viewport:number,workspace:number,width:number):InspectorMode {return viewport<768?'fullscreen':viewport>=1200&&workspace-inspectorWidth(width)-INSPECTOR_SEPARATION>=560?'docked':'overlay';}
export function maximumDockedWidth(workspace:number):number{return Math.max(360,Math.min(640,workspace-560-INSPECTOR_SEPARATION));}
export function stepInspectorWidth(width:number,key:string,max=640):number {return Math.min(max,key==='Home'?360:key==='End'?max:inspectorWidth(width+(key==='ArrowLeft'?16:key==='ArrowRight'?-16:0)));}
export function parseInspectorWidth(raw:string|null):number {try{const v=JSON.parse(raw??'null');return v?.version===1&&typeof v.width==='number'?inspectorWidth(v.width):440;}catch{return 440;}}
export function inspectorWidthStorageKey(projectKey:string):string {return `spm-inspector-v1:${projectKey}`;}
