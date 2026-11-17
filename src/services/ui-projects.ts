import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { loadPortfolioRegistry, validatePortfolioProjectPath } from './portfolio.ts';

export interface UiRepositoriesData { currentId:string|null; workspaceKey:string; projects:Array<{id:string;name:string}>; registrationAllowed:boolean; registryError?:string }
export interface UiProjectSelection { readonly root:string; readonly currentId:string|null; readonly workspaceKey:string; readonly projects:Array<{id:string;name:string}>; readonly registryError?:string }
export const workspaceKeyForRoot=(root:string)=>createHash('sha256').update(`spm-workspace-v1\0${root}`).digest('hex');
export function registrationAllowed(host:string|undefined):boolean { return host==='::1'||!!host&&/^127(?:\.\d{1,3}){3}$/.test(host)&&host.split('.').every(n=>Number(n)<=255); }
export async function resolveUiProject(search:URLSearchParams,launchRoot:string,registryFile?:string):Promise<UiProjectSelection> {
 const values=search.getAll('project'); if(values.length>1||values.length===1&&(!values[0]||values[0].length>4096)) throw new Error('Invalid project selection.');
 let registry; let registryError:string|undefined;
 try{registry=await loadPortfolioRegistry(registryFile);}catch{if(values.length)throw new Error('Portfolio registry could not be read.');registry={version:1 as const,projects:[]};registryError='Portfolio registry could not be read. Check the registry file.';}
 const projects=registry.projects.map(p=>({id:p.id,name:p.name??p.id}));
 let root:string; const currentId=values[0]??null;
 if(currentId!==null){const record=registry.projects.find(p=>p.id===currentId);if(!record)throw new Error('Registered project not found.');try{root=await validatePortfolioProjectPath(record.path);}catch{throw new Error('Registered project is unavailable or has no project configuration.');}}
 else root=await realpath(launchRoot);
 return Object.freeze({root,currentId,workspaceKey:workspaceKeyForRoot(root),projects,...(registryError?{registryError}:{})});
}
export function expectedWorkspaceStatus(selection:UiProjectSelection,expected:string|null):number {if(expected===null)return selection.currentId===null?0:400;return expected===selection.workspaceKey?0:409;}
export function repositoriesData(selection:UiProjectSelection,host:string|undefined):UiRepositoriesData {return {currentId:selection.currentId,workspaceKey:selection.workspaceKey,projects:selection.projects,registrationAllowed:registrationAllowed(host),...(selection.registryError?{registryError:selection.registryError}:{})};}
