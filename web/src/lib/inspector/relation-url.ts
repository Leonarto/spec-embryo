import {normalizeRelationPage,parseRelationPages,setRelationPage,type DetailRelation,type RelationPages} from '../../../../src/services/detail-relations.ts';
import type {InspectorIdentity} from '../../../../src/services/workspace-detail.ts';
interface Context {identity?:InspectorIdentity;urlIdentity?:InspectorIdentity;revision?:string;epoch:number;pending:boolean;url:URL}
const key=(identity:InspectorIdentity|undefined)=>identity?`${identity.kind}:${identity.id}`:'';
/** Public navigation completion gates initial shallow writes; each queued key retains its own URL intent. */
export class RelationURLCanonizer {
 private mounted=false;private ready=false;private disposed=false;private navigation=0;
 private pending?:{identity:string;revision:string;epoch:number;changes:Map<DetailRelation,{page:number;intent:number}>};
 constructor(private read:()=>Context,private replace:(url:URL)=>void){}
 get enhanced(){return this.mounted&&this.ready&&!this.disposed;}
 mount(){this.mounted=true;this.flush();}
 async afterNavigation(complete:Promise<void>){const token=++this.navigation;try{await complete;}catch{return;}if(this.disposed||token!==this.navigation)return;this.ready=true;this.flush();}
 enqueue(pages:RelationPages){
  if(this.disposed)return;const current=this.read();if(!current.identity||!current.revision||current.pending||key(current.identity)!==key(current.urlIdentity))return;
  if(!this.pending||this.pending.identity!==key(current.identity)||this.pending.revision!==current.revision||this.pending.epoch!==current.epoch)this.pending={identity:key(current.identity),revision:current.revision,epoch:current.epoch,changes:new Map()};
  const intent=parseRelationPages(current.identity.kind,current.url.searchParams);
  for(const [name,page]of Object.entries(pages))this.pending.changes.set(name as DetailRelation,{page:normalizeRelationPage(page),intent:intent[name as DetailRelation]??1});
  this.flush();
 }
 private flush(){
  if(!this.enhanced||!this.pending)return;const patch=this.pending,current=this.read();this.pending=undefined;
  if(current.pending||patch.identity!==key(current.identity)||patch.identity!==key(current.urlIdentity)||patch.revision!==current.revision||patch.epoch!==current.epoch)return;
  const url=new URL(current.url),before=url.searchParams.toString();
  for(const [name,{page,intent}]of patch.changes)if(normalizeRelationPage(url.searchParams.get(`rel.${name}`))===intent)setRelationPage(url.searchParams,name,page);
  if(url.searchParams.toString()!==before)this.replace(url);
 }
 dispose(){this.disposed=true;this.navigation++;this.pending=undefined;}
}
