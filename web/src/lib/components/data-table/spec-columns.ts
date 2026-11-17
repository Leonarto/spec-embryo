import type { WorkspaceSpecRow } from '../../../../../src/services/workspace.ts';
import type { ColumnDef } from './types.ts';
const labels={proposed:'Proposed',active:'Active',paused:'Paused',done:'Done',archived:'Archived'};
const symbols={proposed:'◇',active:'●',paused:'Ⅱ',done:'✓',archived:'□'};
export const specColumns:ColumnDef<WorkspaceSpecRow>[]=[
  {key:'select',label:'Selection',kind:'selection',textValue:()=>'',defaultWidth:36,minWidth:36,maxWidth:36,locked:true,copyable:false},
  {key:'id',label:'ID',kind:'identity',textValue:row=>row.id,href:row=>`/specs/${encodeURIComponent(row.id)}`,sortKey:'id',defaultWidth:108,minWidth:96,maxWidth:180,locked:true,mono:true},
  {key:'title',label:'Title',kind:'identity',textValue:row=>row.title,href:row=>`/specs/${encodeURIComponent(row.id)}`,sortKey:'title',defaultWidth:320,minWidth:200,maxWidth:800,locked:true,flex:true},
  {key:'status',label:'Status',textValue:row=>labels[row.status],symbol:row=>symbols[row.status],tone:row=>row.status==='paused'?'warning':row.status==='active'||row.status==='done'?'accent':'neutral',sortKey:'status',defaultWidth:120,minWidth:96,maxWidth:200},
  {key:'progress',label:'Done / total',textValue:row=>`${row.progress.done} / ${row.linkedTaskCount}`,sortKey:'progress',defaultWidth:112,minWidth:96,maxWidth:200,align:'right',mono:true},
  {key:'blocked',label:'Blocked',textValue:row=>String(row.progress.blocked),tone:row=>row.progress.blocked?'danger':'neutral',sortKey:'blocked',defaultWidth:84,minWidth:72,maxWidth:160,align:'right',mono:true},
  {key:'review',label:'Review',textValue:row=>String(row.progress.review),tone:row=>row.progress.review?'warning':'neutral',sortKey:'review',defaultWidth:80,minWidth:72,maxWidth:160,align:'right',mono:true},
  {key:'tasks',label:'Tasks',textValue:row=>String(row.linkedTaskCount),sortKey:'tasks',defaultWidth:84,minWidth:72,maxWidth:160,align:'right',mono:true},
  {key:'owner',label:'Owner',textValue:row=>row.owner??'—',sortKey:'owner',defaultWidth:140,minWidth:100,maxWidth:320,defaultVisible:false},
  {key:'updatedAt',label:'Updated',textValue:row=>row.updatedAt??'—',sortKey:'updatedAt',defaultWidth:160,minWidth:120,maxWidth:240,mono:true,defaultVisible:false},
  {key:'tags',label:'Tags',textValue:row=>row.tags.join(', ')||'—',defaultWidth:160,minWidth:100,maxWidth:360,defaultVisible:false},
];
