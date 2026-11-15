import { HEADER_ROW, type FocusedCell, type TableSort } from './types.ts';
export function defaultFocus(ids:readonly string[],keys:readonly string[]):FocusedCell {
  return {rowId:ids[0]??HEADER_ROW,columnKey:keys.includes('id')?'id':keys[0]??''};
}
export function moveGridFocus(current:FocusedCell,ids:readonly string[],keys:readonly string[],key:string,ctrl=false,viewportRows=1):FocusedCell {
  const rows=[HEADER_ROW,...ids];let row=Math.max(0,rows.indexOf(current.rowId)),column=Math.max(0,keys.indexOf(current.columnKey));
  if(key==='ArrowUp')row--;else if(key==='ArrowDown')row++;else if(key==='ArrowLeft')column--;else if(key==='ArrowRight')column++;
  else if(key==='Home'){column=0;if(ctrl)row=0;}else if(key==='End'){column=keys.length-1;if(ctrl)row=rows.length-1;}
  else if(key==='PageUp')row-=Math.max(1,viewportRows);else if(key==='PageDown')row+=Math.max(1,viewportRows);
  return {rowId:rows[Math.max(0,Math.min(rows.length-1,row))]!,columnKey:keys[Math.max(0,Math.min(keys.length-1,column))]??''};
}
export function reconcileFocus(current:FocusedCell,oldIds:readonly string[],ids:readonly string[],oldKeys:readonly string[],keys:readonly string[]):{cell:FocusedCell;removed:boolean;empty:boolean} {
  const removed=current.rowId!==HEADER_ROW&&!ids.includes(current.rowId);
  const rowId=!removed?current.rowId:ids[Math.min(Math.max(0,oldIds.indexOf(current.rowId)),ids.length-1)]??HEADER_ROW;
  const columnKey=keys.includes(current.columnKey)?current.columnKey:keys[Math.min(Math.max(0,oldKeys.indexOf(current.columnKey)),keys.length-1)]??'';
  return {cell:{rowId,columnKey},removed,empty:removed&&!ids.length};
}
export function toggleRowSelection(ids:readonly string[],selected:ReadonlySet<string>,anchor:string|undefined,id:string,extend=false):{selected:Set<string>;anchor:string|undefined} {
  const next=new Set([...selected].filter(value=>ids.includes(value)));if(!ids.includes(id))return {selected:next,anchor};
  const start=anchor?ids.indexOf(anchor):-1,end=ids.indexOf(id);
  if(extend&&start>=0){for(const value of ids.slice(Math.min(start,end),Math.max(start,end)+1))next.add(value);return {selected:next,anchor};}
  if(next.has(id))next.delete(id);else next.add(id);return {selected:next,anchor:id};
}
export function reconcileSelection(ids:readonly string[],selected:ReadonlySet<string>,anchor?:string):{selected:Set<string>;anchor:string|undefined;removed:number} {
  const valid=new Set(ids),next=new Set([...selected].filter(id=>valid.has(id)));return {selected:next,anchor:anchor&&valid.has(anchor)?anchor:undefined,removed:selected.size-next.size};
}
export function toggleTableSort(current:readonly TableSort[],key:string,secondary=false):TableSort[] {
  const existing=current.find(sort=>sort.key===key),next:TableSort={key,direction:existing?.direction==='asc'?'desc':'asc'};
  if(!secondary||!current.length)return [next];
  if(current[0]!.key===key)return [next,...current.slice(1,2)];
  return [current[0]!,next];
}
