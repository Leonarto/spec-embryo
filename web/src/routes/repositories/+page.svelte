<script lang="ts">
  import {page} from '$app/state';
  import {getInspector} from '../../lib/inspector/controller.svelte.ts';
  import {isPlainActivation} from '../../lib/inspector/history.ts';
  const inspector=getInspector();
  import {projectHref} from '../../lib/workspace/project.ts';
  let {data,form}=$props();
</script>
<svelte:head><title>Repositories · spm</title></svelte:head>
<section class="repositories">
  <p class="eyebrow">Workspace / Repositories</p>
  <h1>Registered repositories</h1>
  <p>Open a registered project from the repository selector. Each project keeps its own memory.</p>
  {#if data.repositories.registryError}<p role="alert" class="error">{data.repositories.registryError}</p>{/if}
  <ul>{#each data.repositories.projects as project}<li><a href={projectHref('/tasks',new URL(`/tasks?project=${encodeURIComponent(project.id)}`,page.url))} onclick={event=>{if(isPlainActivation(event)){event.preventDefault();inspector.switchProject(event.currentTarget.href);}}}>{project.name}</a><code>{project.id}</code></li>{:else}<li>No repositories registered yet.</li>{/each}</ul>
  {#if data.repositories.registrationAllowed}
    <h2>Register a repository</h2><p>Choose an existing project directory containing <code>.specpm/config.toml</code>.</p>
    {#if form?.error}<p role="alert" class="error">{form.error}</p>{/if}
    <form method="POST"><label>Name<input name="name" value={form?.values?.name??''} required /></label><label>Directory<input name="path" value={form?.values?.path??''} required /></label><label>ID <span>Optional</span><input name="id" value={form?.values?.id??''} /></label><button type="submit">Register repository</button></form>
  {:else}<p>Browser registration is available when the server binds to loopback. Use <code>spm portfolio register</code> from the command line.</p>{/if}
</section>
<style>
.repositories{max-width:48rem;margin:1rem auto;padding:1rem}.eyebrow{font: .75rem var(--mono-font);text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}h1{font-size:1.6rem;margin:.5rem 0}h2{font-size:1rem;margin:2rem 0 .5rem}p{color:var(--text-muted)}ul{list-style:none;padding:0;border-top:1px solid var(--border-subtle)}li{display:flex;justify-content:space-between;gap:1rem;padding:.75rem 0;border-bottom:1px solid var(--border-subtle)}a{color:var(--accent)}code{font-family:var(--mono-font);overflow-wrap:anywhere}form{display:grid;gap:.75rem;max-width:32rem}label{display:grid;gap:.3rem;font-size:.8rem}label span{color:var(--text-muted)}input,button{min-height:2.5rem;padding:.4rem .6rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text)}button{justify-self:start;color:var(--accent);cursor:pointer}.error{color:var(--warning)}
</style>
