import {describe,expect,test} from 'bun:test';
import {defaultFocus,moveGridFocus,reconcileFocus,reconcileSelection,toggleRowSelection,toggleTableSort} from '../web/src/lib/components/data-table/model.ts';
import {defaultTablePreferences,moveColumn,parseTablePreferences,renderedColumns,resizeColumn,tableStorageKey} from '../web/src/lib/components/data-table/preferences.ts';
import {idsToText,rowsToTsv,spreadsheetText} from '../web/src/lib/components/data-table/clipboard.ts';
import {HEADER_ROW,type ColumnDef} from '../web/src/lib/components/data-table/types.ts';
const ids=['A','B','C','D'],keys=['select','id','title','status'];
const columns:ColumnDef<{id:string;title:string}>[]=[{key:'select',label:'Select',kind:'selection',textValue:()=>'',defaultWidth:36,minWidth:36,maxWidth:36,locked:true,copyable:false},{key:'id',label:'ID',kind:'identity',textValue:r=>r.id,defaultWidth:108,minWidth:96,maxWidth:180,locked:true},{key:'title',label:'Title',kind:'identity',textValue:r=>r.title,defaultWidth:320,minWidth:200,maxWidth:800,locked:true,flex:true},{key:'status',label:'Status',textValue:()=> 'Todo',defaultWidth:120,minWidth:96,maxWidth:200},{key:'optional',label:'Optional',textValue:()=>'',defaultWidth:64,minWidth:64,maxWidth:200,defaultVisible:false}];
describe('data table navigation and selection',()=>{
 test('clamps keyboard movement to loaded page and includes header bounds',()=>{
  expect(defaultFocus(ids,keys)).toEqual({rowId:'A',columnKey:'id'});
  const cell={rowId:'B',columnKey:'title'};
  expect(moveGridFocus(cell,ids,keys,'ArrowUp')).toEqual({rowId:'A',columnKey:'title'});
  expect(moveGridFocus(cell,ids,keys,'Home')).toEqual({rowId:'B',columnKey:'select'});
  expect(moveGridFocus(cell,ids,keys,'Home',true)).toEqual({rowId:HEADER_ROW,columnKey:'select'});
  expect(moveGridFocus(cell,ids,keys,'End',true)).toEqual({rowId:'D',columnKey:'status'});
  expect(moveGridFocus(cell,ids,keys,'PageDown',false,100)).toEqual({rowId:'D',columnKey:'title'});
  expect(moveGridFocus(cell,ids,keys,'PageUp',false,100)).toEqual({rowId:HEADER_ROW,columnKey:'title'});
  expect(moveGridFocus({rowId:'D',columnKey:'status'},ids,keys,'ArrowRight')).toEqual({rowId:'D',columnKey:'status'});
  expect(defaultFocus([],keys).rowId).toBe(HEADER_ROW);
 });
 test('range adds inclusive IDs without dropping outside selection and refresh intersects IDs',()=>{
  const a=toggleRowSelection(ids,new Set(['D']),undefined,'B');
  expect([...a.selected]).toEqual(['D','B']);expect(a.anchor).toBe('B');
  const b=toggleRowSelection(ids,a.selected,a.anchor,'C',true);expect([...b.selected]).toEqual(['D','B','C']);expect(b.anchor).toBe('B');
  const c=toggleRowSelection(ids,b.selected,b.anchor,'A',true);expect([...c.selected]).toEqual(['D','B','C','A']);
  expect(toggleRowSelection(ids,c.selected,c.anchor,'B').selected.has('B')).toBe(false);
  expect(reconcileSelection(['C','D'],c.selected,c.anchor)).toEqual({selected:new Set(['D','C']),anchor:undefined,removed:2});
 });
 test('focus survives reorder and maps removed IDs/columns to nearest position',()=>{
  expect(reconcileFocus({rowId:'B',columnKey:'title'},ids,['C','B','A'],keys,['id','title','status']).cell).toEqual({rowId:'B',columnKey:'title'});
  expect(reconcileFocus({rowId:'B',columnKey:'title'},ids,['A','C'],keys,['select','id','status']).cell).toEqual({rowId:'C',columnKey:'status'});
  expect(reconcileFocus({rowId:'B',columnKey:'id'},ids,[],keys,keys)).toMatchObject({empty:true,removed:true,cell:{rowId:HEADER_ROW,columnKey:'id'}});
 });
 test('native sort intent keeps at most primary/secondary with stable direction toggles',()=>{
  const first=toggleTableSort([], 'priority');expect(first).toEqual([{key:'priority',direction:'asc'}]);
  const two=toggleTableSort(first,'title',true);expect(two).toEqual([...first,{key:'title',direction:'asc'}]);
  expect(toggleTableSort(two,'status',true)).toEqual([...first,{key:'status',direction:'asc'}]);
  expect(toggleTableSort(two,'priority',true)).toEqual([{key:'priority',direction:'desc'},two[1]!]);
  expect(toggleTableSort(two,'title')).toEqual([{key:'title',direction:'desc'}]);
 });
});
describe('bounded per-project preferences',()=>{
 test('normalizes corrupt, stale, duplicate and out-of-bounds storage while locking identity',()=>{
  const defaults=defaultTablePreferences(columns);expect(parseTablePreferences('{bad',columns)).toEqual(defaults);expect(parseTablePreferences('{"version":2,"columns":[]}',columns)).toEqual(defaults);
  const parsed=parseTablePreferences(JSON.stringify({version:1,density:'comfortable',columns:[{key:'status',width:9999,visible:false},{key:'id',width:-1,visible:false},{key:'status',width:100,visible:true},{key:'unknown',width:5}]}),columns);
  expect(parsed.columns.map(c=>c.key)).toEqual(['select','id','title','status','optional']);expect(parsed.columns[1]).toMatchObject({width:96,visible:true});expect(parsed.columns[3]).toMatchObject({width:200,visible:false});
  expect(tableStorageKey('abc','task')).not.toBe(tableStorageKey('def','task'));expect(tableStorageKey('abc','task')).not.toBe(tableStorageKey('abc','spec'));
 });
 test('title auto fills space, explicit resize survives viewport changes, reset restores auto',()=>{
  const base=defaultTablePreferences(columns),auto=renderedColumns(base,columns,1200);expect(auto.find(c=>c.key==='title')!.width).toBe(800);
  const explicit=resizeColumn(base,columns,'title',420);expect(renderedColumns(explicit,columns,1400).find(c=>c.key==='title')!.width).toBe(420);expect(renderedColumns(explicit,columns,600).find(c=>c.key==='title')!.width).toBe(420);
  expect(base.columns.find(c=>c.key==='title')!.width).toBe(320);expect(renderedColumns(defaultTablePreferences(columns),columns,1000).find(c=>c.key==='title')!.width).toBe(736);
  expect(moveColumn(base,columns,'status',-1)).toBe(base);expect(moveColumn(base,columns,'optional',-1).columns.map(c=>c.key)).toEqual(['select','id','title','optional','status']);
  expect(resizeColumn(base,columns,'title',9999).columns[2]!.width).toBe(800);
 });
});
describe('safe visible-page clipboard',()=>{
 test('copies only selected visible rows/columns in displayed order with headers',()=>{
  const rows=[{id:'B',title:'=SUM(1)'},{id:'A',title:'Line\twith\nnewlines'},{id:'C',title:'Hidden'}];
  expect(rowsToTsv(rows,[columns[2]!,columns[0]!,columns[1]!],r=>r.id,new Set(['A','B','outside']))).toBe("Title\tID\n'=SUM(1)\tB\nLine with newlines\tA");
  expect(idsToText(rows,r=>r.id,new Set(['A','B']))).toBe('B\nA');expect(rowsToTsv(rows,columns,r=>r.id,new Set())).toBeUndefined();
 });
 test('neutralizes spreadsheet formula prefixes after whitespace and keeps ordinary Unicode',()=>{
  for(const input of ['=X','+1','-2','@SUM','  =X','\t+X'])expect(spreadsheetText(input).startsWith("'")).toBe(true);
  expect(spreadsheetText('Árbol 🌿')).toBe('Árbol 🌿');expect(spreadsheetText('a\r\nb\tc')).toBe('a b c');
 });
});
