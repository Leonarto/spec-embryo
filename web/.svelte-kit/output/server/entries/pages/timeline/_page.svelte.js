import { _ as escape_html, c as ensure_array_like, f as stringify, i as attr_style, l as head, o as derived, r as attr_class } from "../../../chunks/index-server.js";
import { n as Arrow_right, t as Clock_3 } from "../../../chunks/clock-3.js";
import { t as Folder_kanban } from "../../../chunks/folder-kanban.js";
import { t as Orbit } from "../../../chunks/orbit.js";
//#region src/routes/timeline/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const dashboard = derived(() => data.dashboard);
		const totalUnits = derived(() => Math.max(dashboard().timeline.totalUnits, 1));
		const ruler = derived(() => Array.from({ length: totalUnits() }, (_, index) => index + 1));
		head("1fjec68", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(dashboard().project.name)} Timeline</title>`);
			});
		});
		$$renderer.push(`<section class="view-header svelte-1fjec68"><div class="header-copy svelte-1fjec68"><p class="eyebrow svelte-1fjec68">Deterministic sequence</p> <h3 class="svelte-1fjec68">Gantt View</h3></div> <p class="intro svelte-1fjec68">Timeline position is derived from declared dependencies. Bar width uses default effort units so the sequence is readable now without pretending to know dates.</p></section> <section class="timeline-shell svelte-1fjec68"><div class="timeline-ruler svelte-1fjec68"${attr_style(`--total:${totalUnits()}`)}><!--[-->`);
		const each_array = ensure_array_like(ruler());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let unit = each_array[$$index];
			$$renderer.push(`<span class="svelte-1fjec68">${escape_html(unit)}</span>`);
		}
		$$renderer.push(`<!--]--></div> <div class="timeline-list svelte-1fjec68"><!--[-->`);
		const each_array_1 = ensure_array_like(dashboard().timeline.items);
		for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
			let item = each_array_1[$$index_2];
			$$renderer.push(`<article class="timeline-row svelte-1fjec68"><div class="row-meta svelte-1fjec68"><div class="meta-head svelte-1fjec68"><span class="task-id svelte-1fjec68">`);
			Folder_kanban($$renderer, {
				size: 13,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> ${escape_html(item.taskId)}</span> <span class="effort-pill svelte-1fjec68">`);
			Clock_3($$renderer, {
				size: 12,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> ${escape_html(item.effort)}u</span></div> <h4 class="svelte-1fjec68">${escape_html(item.title)}</h4> <div class="chip-row svelte-1fjec68"><!--[-->`);
			const each_array_2 = ensure_array_like(item.specIds);
			for (let $$index_1 = 0, $$length = each_array_2.length; $$index_1 < $$length; $$index_1++) {
				let specId = each_array_2[$$index_1];
				$$renderer.push(`<span class="chip svelte-1fjec68">${escape_html(specId)}</span>`);
			}
			$$renderer.push(`<!--]--></div> <div class="span-copy svelte-1fjec68"><span class="svelte-1fjec68">`);
			Arrow_right($$renderer, {
				size: 12,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> ${escape_html(item.start)} -> ${escape_html(item.end)}</span> <span class="svelte-1fjec68">`);
			Orbit($$renderer, {
				size: 12,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> ${escape_html(item.effectiveStatus.replaceAll("_", " "))}</span></div></div> <div class="bar-track svelte-1fjec68"${attr_style(`--total:${totalUnits()}`)}><div${attr_class(`bar ${stringify(item.effectiveStatus)}`, "svelte-1fjec68")}${attr_style(`left:${item.start / totalUnits() * 100}%; width:${(item.end - item.start) / totalUnits() * 100}%`)}><span class="svelte-1fjec68">${escape_html(item.start)} -> ${escape_html(item.end)}</span></div></div></article>`);
		}
		$$renderer.push(`<!--]--></div></section>`);
	});
}
//#endregion
export { _page as default };
