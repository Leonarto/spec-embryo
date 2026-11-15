import {buildWorkspaceDetailEnvelope,type InspectorIdentity} from '../../../../src/services/workspace-detail.ts';
import {getWorkspaceRequestSource,type WorkspaceRequestState} from './workspace.ts';
export async function getWorkspaceDetail(locals:WorkspaceRequestState,identity:InspectorIdentity){return buildWorkspaceDetailEnvelope(await getWorkspaceRequestSource(locals),identity);}
