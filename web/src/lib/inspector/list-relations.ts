import {retainProject} from '../workspace/project.ts';
import {isWorkspaceEntityId} from '../../../../src/services/workspace-query.ts';
import {clearRelationPages,parseRelationPages,writeRelationPages} from '../../../../src/services/detail-relations.ts';
/** List navigation retains presentation intent only for the same valid inspected entity. */
export function retainListRelationIntent(current:URLSearchParams,next:URLSearchParams):URLSearchParams {
 const identity=current.get('inspect'),parts=identity?.split(':'),kind=parts?.[0],id=parts?.[1];
 if(identity&&identity===next.get('inspect')&&parts?.length===2&&(kind==='task'||kind==='spec')&&id&&isWorkspaceEntityId(id,kind))writeRelationPages(next,kind,parseRelationPages(kind,current));
 else clearRelationPages(next);
 return retainProject(current,next);
}
