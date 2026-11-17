/** Preserve opaque project selection without interpreting it as a path. */
export function retainProject(source: URLSearchParams, target: URLSearchParams): URLSearchParams {
  target.delete('project');
  for (const value of source.getAll('project')) target.append('project', value);
  return target;
}
export function projectHref(href: string, source: URL): string {
  const url = new URL(href, source);
  retainProject(source.searchParams, url.searchParams);
  return url.pathname + url.search + url.hash;
}
export function projectHeaders(source: URL, key: string): Record<string,string> {
  return source.searchParams.has('project') ? {'x-spm-workspace-key':key} : {};
}

/** SvelteKit named action token must remain literal and first in the query. */
export function projectAction(path: string, action: string, source: URL): string {
  const params = retainProject(source.searchParams, new URLSearchParams());
  return `${path}?/${action}${params.size ? `&${params}` : ''}`;
}

/** Clean tasks destination used by both enhanced and native repository switching. */
export function repositoryTasksHref(id: string | null): string {
  const params = new URLSearchParams();
  if (id !== null) params.set('project', id);
  return `/tasks${params.size ? `?${params}` : ''}`;
}
