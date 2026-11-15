import {page} from '$app/state';
/** Kit shallow navigation changes page.state but retains page.url. Read both signals;
 * the address bar is the URL authority, and SSR never touches window. */
export function workspaceURL():URL {
  const routed=page.url;
  void page.state;
  return new URL(typeof window==='undefined'?routed.href:window.location.href);
}
