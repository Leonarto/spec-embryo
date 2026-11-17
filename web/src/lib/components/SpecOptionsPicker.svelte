<script lang="ts">
  import {retainProject,projectHref,projectHeaders} from '../workspace/project.ts';
  import { onDestroy, untrack } from "svelte";
  import { page } from "$app/state";
  import type { WorkspaceOptionsResult } from "../../../../src/services/workspace.ts";
  import { normalizeViewQuery, parseWorkspaceOptionsQuery, serializeViewQuery, type WorkspaceOptionsQuery, type WorkspaceRoute } from "../../../../src/services/workspace-query.ts";
  import MultiSelectDropdown from "./MultiSelectDropdown.svelte";

  type OptionsLocation = Pick<WorkspaceOptionsQuery, "q" | "page" | "pageSize">;
  let { initial, seedQuery, selectedValues, filterForm, route, resetKey }: {
    initial: WorkspaceOptionsResult; seedQuery: OptionsLocation; selectedValues: string[];
    filterForm: string; route: WorkspaceRoute; resetKey: string;
  } = $props();
  let options = $state(untrack(() => initial));
  let selected = $state(untrack(() => [...selectedValues]));
  let q = $state(untrack(() => seedQuery.q));
  let loading = $state(false), error = $state(false);
  let sequence = 0, controller: AbortController | undefined;
  let lastResetKey = untrack(() => resetKey);
  let submitted: OptionsLocation = untrack(() => ({ ...seedQuery }));

  function sameQuery(left: OptionsLocation, right: OptionsLocation): boolean {
    return left.q === right.q && left.page === right.page && left.pageSize === right.pageSize;
  }
  function cancelRequest() { sequence++; controller?.abort(); controller = undefined; }

  $effect(() => {
    const source = initial, applied = selectedValues, location = seedQuery, reset = resetKey;
    untrack(() => {
      if (reset !== lastResetKey) {
        lastResetKey = reset;
        cancelRequest();
        options = source;
        selected = [...applied];
        q = location.q;
        submitted = { ...location };
        loading = false;
        error = false;
      } else {
        // An accepted seed refreshes the catalog even when its revision is unchanged.
        if (sameQuery(submitted, location)) {
          cancelRequest();
          options = source;
          loading = false;
          error = false;
        } else {
          // Refresh the last sent query, never the text still being drafted.
          void requestOptions(submitted);
        }
      }
    });
  });

  const controls = $derived(options.options.map(option => ({
    value: option.id, label: option.id,
    description: option.labelOmitted ? "Título omitido por tamaño; abrir la spec para leerlo." : option.title,
    href: option.labelOmitted ? projectHref(`/specs/${encodeURIComponent(option.id)}`,page.url) : undefined,
  })));
  const preserved = $derived.by(() => {
    const params = retainProject(page.url.searchParams,serializeViewQuery(normalizeViewQuery(route, page.url.searchParams)));
    for (const key of ["option_q", "option_page", "option_pageSize"]) params.delete(key);
    return [...params.entries()];
  });
  function href(next: number) {
    const params = new URLSearchParams(preserved);
    params.set("option_q", options.q);
    params.set("option_page", String(next));
    params.set("option_pageSize", String(options.pageSize));
    return `${page.url.pathname}?${params}`;
  }
  function search(targetPage: number, query = q) {
    return requestOptions({ q: query, page: targetPage, pageSize: options.pageSize });
  }
  async function requestOptions(location: OptionsLocation) {
    const request = ++sequence;
    controller?.abort();
    controller = new AbortController();
    loading = true;
    error = false;
    const input = new URLSearchParams({ option_q: location.q, option_page: String(location.page), option_pageSize: String(location.pageSize) });
    const normalized = parseWorkspaceOptionsQuery(input, selected);
    submitted = { q: normalized.q, page: normalized.page, pageSize: normalized.pageSize };
    const url = new URL("/workspace-options", page.url.origin);
    retainProject(page.url.searchParams,url.searchParams);
    url.searchParams.set("q", normalized.q);
    url.searchParams.set("page", String(normalized.page));
    url.searchParams.set("pageSize", String(normalized.pageSize));
    for (const id of selected) url.searchParams.append("spec", id);
    const owned = controller;
    const deadline = setTimeout(() => owned.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: owned.signal, cache: "no-store", headers: projectHeaders(page.url,page.data.repositories?.workspaceKey ?? "") });
      if (!response.ok) throw new Error();
      const value = await response.json() as WorkspaceOptionsResult;
      if (!Array.isArray(value.options) || value.options.length > 100 || !Array.isArray(value.selected)
        || typeof value.totalMatching !== "number" || !Number.isSafeInteger(value.page) || value.page < 1
        || value.pageSize !== normalized.pageSize || value.q !== normalized.q || typeof value.revision !== "string"
        || !value.options.every(option => typeof option.id === "string" && (typeof option.title === "string" || option.labelOmitted === true))) throw new Error();
      if (request === sequence) options = value;
    } catch { if (request === sequence) error = true; }
    finally { clearTimeout(deadline); if (request === sequence) loading = false; }
  }
  onDestroy(cancelRequest);
</script>

<MultiSelectDropdown name="spec" options={controls} selectedValues={selected} form={filterForm} {resetKey} buttonLabel="Specs" emptyLabel="All specs" onSelectionChange={values => selected = values}>
  {#snippet panelHeader()}
    <form class="option-search" method="GET" action={page.url.pathname} onsubmit={event => { event.preventDefault(); void search(1); }}>
      {#each preserved as [name, value]}<input type="hidden" {name} {value} />{/each}
      <input type="hidden" name="option_page" value="1" /><input type="hidden" name="option_pageSize" value={options.pageSize} />
      <label>Find a spec<input type="search" name="option_q" bind:value={q} placeholder="ID or title" /></label>
      <button type="submit" aria-busy={loading}>Search</button>
    </form>
    {#if error}<p class="option-error" role="alert">Previous options · Could not load. <button type="button" onclick={() => void requestOptions(submitted)}>Retry</button></p>{/if}
  {/snippet}
  {#snippet panelFooter()}
    <nav class="option-pager" aria-label="Spec option pages">
      {#if options.page > 1}<a href={href(options.page - 1)} onclick={event => { event.preventDefault(); void search(options.page - 1, options.q); }}>Previous</a>{:else}<span>Previous</span>{/if}
      <span>{options.page} / {Math.max(1, Math.ceil(options.totalMatching / options.pageSize))} · {options.totalMatching} specs</span>
      {#if options.page * options.pageSize < options.totalMatching}<a href={href(options.page + 1)} onclick={event => { event.preventDefault(); void search(options.page + 1, options.q); }}>Next</a>{:else}<span>Next</span>{/if}
    </nav>
    {#if options.options.length === 0}<p>No matching specs. Change the search.</p>{/if}
    {#if selected.length}<p class="selection-note">{selected.length} selected across option pages. Apply to update the view.</p>{/if}
  {/snippet}
</MultiSelectDropdown>
<style>
  .option-search { display:flex;align-items:end;gap:.5rem;margin-bottom:.5rem; }
  label { display:grid;gap:.25rem;flex:1;min-width:0;font-size:.75rem;color:var(--text-muted); }
  input[type="search"] { width:100%;min-width:0;min-height:2rem;padding:.25rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);color:var(--text); }
  button { min-height:2rem;padding:.25rem .5rem;border:1px solid var(--border-control);border-radius:.25rem;background:var(--surface);cursor:pointer; }
  .option-pager { display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.5rem;font-size:.75rem; }
  .option-pager a { display:inline-flex;align-items:center;min-height:1.5rem;color:var(--accent); }
  .option-pager>span,.selection-note { color:var(--text-muted); }
  .selection-note,.option-error { font-size:.75rem;margin:.5rem 0 0; }
  .option-error { color:var(--warning); }
</style>
