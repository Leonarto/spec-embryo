import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { registerPortfolioProject } from '../../../../src/services/portfolio.ts';
import { registrationAllowed, repositoriesData } from '../../../../src/services/ui-projects.ts';
export const load:PageServerLoad=async({locals})=>({repositories:repositoriesData(locals.projectSelection!,process.env.SPM_UI_BIND_HOST)});
export const actions:Actions={default:async({request})=>{
 if(!registrationAllowed(process.env.SPM_UI_BIND_HOST))return fail(403,{values:{name:'',path:'',id:''},error:'Registration is available only on a loopback-bound server.'});
 const form=await request.formData(); const values={name:String(form.get('name')??''),path:String(form.get('path')??''),id:String(form.get('id')??'')};
 let project;
 try {if(!values.name.trim()||!values.path.trim()||[...form.values()].some(value=>typeof value!=='string')||['name','path','id'].some(key=>form.getAll(key).length>1))throw new Error('Enter a name and local directory.');
 project=(await registerPortfolioProject(values.path,{name:values.name.trim(),id:values.id.trim()||undefined,registryFile:process.env.SPM_UI_REGISTRY||undefined})).project;
 }catch(cause){return fail(400,{values,error:cause instanceof Error?cause.message:'Registration failed.'});}
 redirect(303,`/tasks?${new URLSearchParams({project:project.id})}`);
}};
