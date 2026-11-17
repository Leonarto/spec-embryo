import {buildWorkspaceDetailEnvelope,type InspectorIdentity} from '../../../../src/services/workspace-detail.ts';
import type {RelationPages} from '../../../../src/services/detail-relations.ts';
import {getWorkspaceRequestSource,type WorkspaceRequestState} from './workspace.ts';
export async function getWorkspaceDetail(locals:WorkspaceRequestState,identity:InspectorIdentity,pages:RelationPages={}){return buildWorkspaceDetailEnvelope(await getWorkspaceRequestSource(locals),identity,pages);}
