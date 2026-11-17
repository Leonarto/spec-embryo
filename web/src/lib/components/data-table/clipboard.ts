import type { ColumnDef } from './types.ts';
export function spreadsheetText(value:string):string {const text=value.replace(/\r\n|[\t\r\n]/g,' ');return /^\s*[=+\-@]/.test(text)?`'${text}`:text;}
export function rowsToTsv<Row>(rows:readonly Row[],columns:readonly ColumnDef<Row>[],rowKey:(row:Row)=>string,selected:ReadonlySet<string>):string|undefined {
  const visible=rows.filter(row=>selected.has(rowKey(row))),data=columns.filter(column=>column.copyable!==false&&column.kind!=='selection');if(!visible.length)return undefined;
  return [data.map(column=>spreadsheetText(column.label)).join('\t'),...visible.map(row=>data.map(column=>spreadsheetText(column.textValue(row))).join('\t'))].join('\n');
}
export function idsToText<Row>(rows:readonly Row[],rowKey:(row:Row)=>string,selected:ReadonlySet<string>):string|undefined {const ids=rows.filter(row=>selected.has(rowKey(row))).map(row=>spreadsheetText(rowKey(row)));return ids.length?ids.join('\n'):undefined;}
export function isTextEntry(element:Element|null):boolean {return Boolean(element&&((element as HTMLElement).isContentEditable||element.tagName==='TEXTAREA'||element.tagName==='INPUT'&&!['checkbox','radio','button','submit','reset','hidden'].includes((element as HTMLInputElement).type)));}
