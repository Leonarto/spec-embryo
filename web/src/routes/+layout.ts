import type {LayoutLoad} from './$types';
import {loadInspectorComponent} from '../lib/inspector/modules.ts';
export const prerender=false;
export const load:LayoutLoad=async({data})=>{
  if(!data.inspector)return {...data,inspectorComponent:undefined,inspectorModuleError:false};
  try{return {...data,inspectorComponent:await loadInspectorComponent(data.inspector.kind),inspectorModuleError:false};}
  catch{return {...data,inspectorComponent:undefined,inspectorModuleError:true};}
};
