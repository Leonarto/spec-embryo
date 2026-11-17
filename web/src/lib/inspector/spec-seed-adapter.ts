import type {WorkspaceDetailEnvelope} from '../../../../src/services/workspace-detail.ts';
import {specOutcomeFence,type SpecOutcomeFence} from './spec-outcome-fence.ts';
/** Both reader initializers and reactive prop paths pass through this gate. */
export class SpecSeedAdapter {
 private observed=new WeakSet<WorkspaceDetailEnvelope>();
 constructor(private project:()=>string,private fence:SpecOutcomeFence=specOutcomeFence){}
 observe(seed:WorkspaceDetailEnvelope|null|undefined){
  if(!seed)return {seed:undefined,fenced:false,fresh:false};
  const fresh=!this.observed.has(seed);this.observed.add(seed);
  const fenced=seed.kind==='spec'&&this.fence.fenced(this.project(),seed.id);
  return {seed:fresh&&!fenced?seed:undefined,fenced,fresh};
 }
}
