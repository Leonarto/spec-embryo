import type { ColumnDef, ColumnPreference, TablePreferences } from './types.ts';
export function tableStorageKey(projectKey:string,kind:'task'|'spec'):string{return `spm-table-v1:${projectKey}:${kind}`;}
export function clampColumnWidth<Row>(column:ColumnDef<Row>,width:number):number{return Math.max(column.minWidth,Math.min(column.maxWidth,Number.isFinite(width)?width:column.defaultWidth));}
export function defaultTablePreferences<Row>(columns:readonly ColumnDef<Row>[]):TablePreferences{return {version:1,density:'compact',columns:columns.map(column=>({key:column.key,width:column.defaultWidth,visible:column.locked||column.defaultVisible!==false,sizing:column.flex?'auto':'explicit'}))};}
export function parseTablePreferences<Row>(raw:string|null|undefined,columns:readonly ColumnDef<Row>[]):TablePreferences {
  const fallback=defaultTablePreferences(columns);if(!raw)return fallback;
  try{
    const value:unknown=JSON.parse(raw);if(typeof value!=='object'||value===null||!('version'in value)||value.version!==1||!('columns'in value)||!Array.isArray(value.columns))return fallback;
    const known=new Map(columns.map(column=>[column.key,column])),seen=new Set<string>();const normalized:ColumnPreference[]=[];
    for(const item of value.columns){if(!item||typeof item!=='object'||typeof item.key!=='string'||seen.has(item.key)||!known.has(item.key))continue;seen.add(item.key);const column=known.get(item.key)!;normalized.push({key:column.key,sizing:column.flex&&item.sizing!=='explicit'?'auto':'explicit',width:clampColumnWidth(column,typeof item.width==='number'?item.width:column.defaultWidth),visible:column.locked||typeof item.visible!=='boolean'?(column.locked||column.defaultVisible!==false):item.visible});}
    for(const column of fallback.columns)if(!seen.has(column.key))normalized.push(column);
    const locked=columns.filter(column=>column.locked).map(column=>normalized.find(item=>item.key===column.key)!);
    return {version:1,density:'density'in value&&value.density==='comfortable'?'comfortable':'compact',columns:[...locked,...normalized.filter(column=>!known.get(column.key)!.locked)]};
  }catch{return fallback;}
}
export function resizeColumn<Row>(preferences:TablePreferences,columns:readonly ColumnDef<Row>[],key:string,width:number):TablePreferences {
  const column=columns.find(column=>column.key===key);if(!column)return preferences;
  return {...preferences,columns:preferences.columns.map(item=>item.key===key?{...item,width:clampColumnWidth(column,width),sizing:'explicit'}:item)};
}
export function moveColumn<Row>(preferences:TablePreferences,columns:readonly ColumnDef<Row>[],key:string,direction:-1|1):TablePreferences {
  const known=new Map(columns.map(column=>[column.key,column]));const next=[...preferences.columns],index=next.findIndex(column=>column.key===key),target=index+direction;
  if(index<0||target<0||target>=next.length||known.get(key)?.locked||known.get(next[target]!.key)?.locked)return preferences;
  [next[index],next[target]]=[next[target]!,next[index]!];return {...preferences,columns:next};
}

export function renderedColumns<Row>(preferences:TablePreferences,columns:readonly ColumnDef<Row>[],viewport:number){
  const known=new Map(columns.map(column=>[column.key,column]));
  const visible=preferences.columns.filter(item=>item.visible&&known.has(item.key));
  const fixed=visible.filter(item=>!known.get(item.key)!.flex||item.sizing==='explicit').reduce((sum,item)=>sum+item.width,0);
  return visible.map(item=>{const column=known.get(item.key)!;return {...column,width:column.flex&&item.sizing!=='explicit'?clampColumnWidth(column,Math.max(item.width,viewport-fixed)):item.width};});
}
