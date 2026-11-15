import type {InspectorIdentity,InspectorSection} from '../../../../src/services/workspace-detail.ts';
export interface InspectorOpener {rowId:string;columnKey:string;rowIndex:number;listKey:string;tableScroll:{top:number;left:number};viewScroll:{top:number;left:number}}
export interface InspectorEntry {id:string;url:string;predecessor?:{id:string;url:string};opener?:InspectorOpener}
export interface InspectorPageMarker {entryId:string}
/** Normalize URL encoding only; preserve parameter values/order and all non-inspector state. */
export function historyURL(value:string|URL):string {const url=new URL(value);url.search=url.searchParams.toString();return url.href;}
export function withoutInspector(value:string|URL):string {const url=new URL(value);url.searchParams.delete('inspect');url.searchParams.delete('section');return url.href;}
export function inspectorURL(value:string|URL,identity:InspectorIdentity,section:InspectorSection='overview'):string {const url=new URL(value);url.searchParams.set('inspect',`${identity.kind}:${identity.id}`);if(section==='overview')url.searchParams.delete('section');else url.searchParams.set('section',section);return url.href;}
export function canonicalDetailHref(identity:InspectorIdentity):string {return `/${identity.kind==='task'?'tasks':'specs'}/${encodeURIComponent(identity.id)}`;}
export function isPlainActivation(event:Pick<MouseEvent,'button'|'ctrlKey'|'metaKey'|'shiftKey'|'altKey'|'defaultPrevented'>):boolean {return !event.defaultPrevented&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey;}
/** Proof is session-memory only. Reloaded markers alone never establish ownership. */
export class InspectorHistoryLedger {
  private entries=new Map<string,InspectorEntry>();
  get(id:string|undefined){return id?this.entries.get(id):undefined;}
  record(entry:InspectorEntry){this.entries.set(entry.id,{...entry,url:historyURL(entry.url),...(entry.predecessor?{predecessor:{...entry.predecessor,url:historyURL(entry.predecessor.url)}}:{})});}
  replace(id:string,url:string){const entry=this.entries.get(id);if(entry)this.record({...entry,url});}
  verified(id:string|undefined,url:string):InspectorEntry|undefined {const entry=this.get(id);return entry?.url===historyURL(url)?entry:undefined;}
  canBackClose(id:string|undefined,url:string):boolean {
    const current=this.verified(id,url),previous=current?.predecessor;if(!previous)return false;
    const known=this.verified(previous.id,previous.url);return !!known&&known.url===historyURL(withoutInspector(url));
  }
}
