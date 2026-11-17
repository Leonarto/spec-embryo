import {getContext,setContext} from 'svelte';
import type {WorkspaceDetailEnvelope} from '../../../../../src/services/workspace-detail.ts';
export interface QuestionRegistration {
 protected:()=>boolean;saving:()=>boolean;save:()=>Promise<boolean>;discard:()=>void;
 accept:(candidate?:WorkspaceDetailEnvelope)=>boolean;
}
export interface QuestionNavigation {register:(editor:QuestionRegistration)=>()=>void}
export interface QuestionReader {register:(editor:QuestionRegistration)=>()=>void;invalidate:()=>void;refresh:()=>Promise<void>}
const navigation=Symbol('question-navigation'),reader=Symbol('question-reader');
export function provideQuestionNavigation(value:QuestionNavigation){setContext(navigation,value);}
export function questionNavigation(){return getContext<QuestionNavigation|undefined>(navigation);}
export function provideQuestionReader(value:QuestionReader){setContext(reader,value);}
export function questionReader(){return getContext<QuestionReader|undefined>(reader);}
