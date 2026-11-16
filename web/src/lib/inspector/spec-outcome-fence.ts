/** Browser-document identity metadata only. Never holds documents, answers or storage. */
export class SpecOutcomeFence {
 private generations=new Map<string,Map<string,number>>();
 generation(project:string,id:string){return this.generations.get(project)?.get(id)??0;}
 fenced(project:string,id:string){return this.generation(project,id)>0;}
 mark(project:string,id:string){let specs=this.generations.get(project);if(!specs)this.generations.set(project,specs=new Map());const next=(specs.get(id)??0)+1;specs.set(id,next);return next;}
}
// Mutated only in the browser; SSR never establishes session coordination.
export const specOutcomeFence=new SpecOutcomeFence();
