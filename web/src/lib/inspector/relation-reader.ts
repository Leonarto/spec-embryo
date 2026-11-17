import type {DetailRelation} from '../../../../src/services/detail-relations.ts';
import type {InspectorDetailState} from './detail-resource.ts';
/** Presentation seam shared by canonical and inspector readers; native links always remain. */
export interface RelationReader {url:string;enhanced:boolean;state:InspectorDetailState;page:(relation:DetailRelation,page:number)=>void;retry:(relation:DetailRelation)=>void}
