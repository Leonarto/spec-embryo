import type { WorkspaceTaskRow } from '../../../../../src/services/workspace.ts';
import type { ColumnDef } from './types.ts';
const labels={todo:'Todo',in_progress:'In progress',blocked:'Blocked',review:'Review',done:'Done',cancelled:'Cancelled'};
const symbols={todo:'□',in_progress:'●',blocked:'!',review:'○',done:'✓',cancelled:'⊘'};
export const taskColumns:ColumnDef<WorkspaceTaskRow>[]=[
  {key:'select',label:'Selection',kind:'selection',textValue:()=>'',defaultWidth:36,minWidth:36,maxWidth:36,locked:true,copyable:false},
  {key:'id',label:'ID',kind:'identity',textValue:row=>row.id,href:row=>`/tasks/${encodeURIComponent(row.id)}`,sortKey:'id',defaultWidth:108,minWidth:96,maxWidth:180,locked:true,mono:true},
  {key:'title',label:'Title',kind:'identity',textValue:row=>row.title,href:row=>`/tasks/${encodeURIComponent(row.id)}`,sortKey:'title',defaultWidth:320,minWidth:200,maxWidth:800,locked:true,flex:true},
  {key:'status',label:'Status',textValue:row=>labels[row.effectiveStatus],symbol:row=>symbols[row.effectiveStatus],tone:row=>row.effectiveStatus==='blocked'?'danger':row.effectiveStatus==='review'?'warning':row.effectiveStatus==='in_progress'?'info':row.effectiveStatus==='done'?'accent':'neutral',sortKey:'status',defaultWidth:120,minWidth:96,maxWidth:200},
  {key:'priority',label:'Priority',headerLabel:'P',textValue:row=>String(row.priority),sortKey:'priority',defaultWidth:64,minWidth:56,maxWidth:120,align:'right',mono:true},
  {key:'specs',label:'Specs',textValue:row=>row.specIds.join(', ')||'—',sortKey:'spec',defaultWidth:140,minWidth:100,maxWidth:360,mono:true},
  {key:'blockers',label:'Blockers',textValue:row=>String(row.unmetDependencies.length),sortKey:'blocked',defaultWidth:84,minWidth:72,maxWidth:200,align:'right',mono:true},
  {key:'dependencies',label:'Dependencies',textValue:row=>String(row.dependsOn.length),sortKey:'dependencies',defaultWidth:96,minWidth:64,maxWidth:200,align:'right',mono:true,defaultVisible:false},
  {key:'downstream',label:'Downstream',textValue:row=>String(row.downstreamCount),sortKey:'downstream',defaultWidth:96,minWidth:64,maxWidth:200,align:'right',mono:true,defaultVisible:false},
  ...(['createdAt','updatedAt','completedAt','cancelledAt'] as const).map(key=>({key,label:{createdAt:'Created',updatedAt:'Updated',completedAt:'Completed',cancelledAt:'Cancelled'}[key],textValue:(row:WorkspaceTaskRow)=>row[key]??'—',sortKey:key,defaultWidth:160,minWidth:120,maxWidth:240,mono:true,defaultVisible:false})),
];
