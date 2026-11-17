import type {Component} from 'svelte';
export type DetailComponent=Component<any>;
/** Dynamic references only: a closed list never evaluates detail/Mermaid modules. */
export async function loadInspectorComponent(kind:'task'|'spec'):Promise<DetailComponent>{return kind==='task'?(await import('../components/detail/TaskDetail.svelte')).default:(await import('../components/detail/SpecDetail.svelte')).default;}
