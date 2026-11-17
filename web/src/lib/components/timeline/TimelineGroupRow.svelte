<script lang="ts">
  import {projectHref} from "../../workspace/project.ts";
  import {workspaceURL as projectSourceURL} from "../../workspace/location.svelte.ts";
  import type {WorkspaceTimelineGroup} from '../../../../../src/services/workspace-timeline-contract.ts';
  let {group,collapsed,onToggle,onInspect}:{group:WorkspaceTimelineGroup;collapsed:boolean;onToggle:()=>void;onInspect:(event:MouseEvent,id:string)=>void}=$props();
</script>
<div class="group" data-group-id={group.specId}>
  <button type="button" data-group-toggle={group.specId} aria-expanded={!collapsed} aria-label={`${collapsed?'Expand':'Collapse'} ${group.specTitle}`} onclick={onToggle}><span aria-hidden="true">{collapsed?'▸':'▾'}</span></button>
  <a href={projectHref(`/specs/${group.specId}`,projectSourceURL())} onclick={event=>onInspect(event,group.specId)} title={`${group.specId} · ${group.specTitle}`} data-sveltekit-preload-data="off" data-sveltekit-preload-code="off"><span class="id">{group.specId}</span><strong>{group.specTitle}</strong></a>
  <span class="count">{group.rows.length} tasks</span><span class="state">Spec: {group.specStatus.replaceAll('_',' ')}</span>{#if group.selectionState!=='none'}<span class="relation">{group.selectionState.replaceAll('_',' ')}</span>{/if}
</div>
<style>.group{height:100%;display:flex;align-items:center;gap:.5rem;padding:0 .625rem;border-top:1px solid var(--border-control);border-bottom:1px solid var(--border-subtle);background:var(--surface-raised);font-size:.75rem}.group button{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex-shrink:0;background:var(--surface);border:1px solid var(--border-control);border-radius:.25rem;color:var(--text);cursor:pointer}.group a{min-height:24px;display:flex;align-items:center;gap:.75rem;min-width:0;text-decoration:none;color:var(--text)}.group a strong{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:600;min-width:0}.id{color:var(--accent);white-space:nowrap}.count,.state{white-space:nowrap;color:var(--text-muted);font-variant-numeric:tabular-nums}.count{margin-left:auto}.relation{color:var(--info);white-space:nowrap}@media(pointer:coarse){.group button{width:44px;height:44px}.group a{min-height:44px}}</style>
