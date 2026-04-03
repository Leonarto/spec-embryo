import { _ as escape_html, c as ensure_array_like, d as spread_props, f as stringify, h as attr, l as head, o as derived, r as attr_class } from "../../chunks/index-server.js";
import { t as page } from "../../chunks/state.js";
import { t as Icon } from "../../chunks/Icon.js";
import { n as Shield_alert, r as Chart_no_axes_gantt, t as Shield_check } from "../../chunks/shield-check.js";
import { t as Folder_kanban } from "../../chunks/folder-kanban.js";
import { n as Notebook_text, t as Sparkles } from "../../chunks/sparkles.js";
//#region node_modules/@lucide/svelte/dist/icons/layout-dashboard.svelte
function Layout_dashboard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/**
		* @license @lucide/svelte v1.7.0 - ISC
		*
		* ISC License
		*
		* Copyright (c) 2026 Lucide Icons and Contributors
		*
		* Permission to use, copy, modify, and/or distribute this software for any
		* purpose with or without fee is hereby granted, provided that the above
		* copyright notice and this permission notice appear in all copies.
		*
		* THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
		* WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
		* MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
		* ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
		* WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
		* ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
		* OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
		*
		* ---
		*
		* The following Lucide icons are derived from the Feather project:
		*
		* airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out
		*
		* The MIT License (MIT) (for the icons listed above)
		*
		* Copyright (c) 2013-present Cole Bemis
		*
		* Permission is hereby granted, free of charge, to any person obtaining a copy
		* of this software and associated documentation files (the "Software"), to deal
		* in the Software without restriction, including without limitation the rights
		* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		* copies of the Software, and to permit persons to whom the Software is
		* furnished to do so, subject to the following conditions:
		*
		* The above copyright notice and this permission notice shall be included in all
		* copies or substantial portions of the Software.
		*
		* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		* SOFTWARE.
		*
		*/
		let { $$slots, $$events, ...props } = $$props;
		Icon($$renderer, spread_props([
			{ name: "layout-dashboard" },
			props,
			{
				iconNode: [
					["rect", {
						"width": "7",
						"height": "9",
						"x": "3",
						"y": "3",
						"rx": "1"
					}],
					["rect", {
						"width": "7",
						"height": "5",
						"x": "14",
						"y": "3",
						"rx": "1"
					}],
					["rect", {
						"width": "7",
						"height": "9",
						"x": "14",
						"y": "12",
						"rx": "1"
					}],
					["rect", {
						"width": "7",
						"height": "5",
						"x": "3",
						"y": "16",
						"rx": "1"
					}]
				],
				children: ($$renderer) => {
					props.children?.($$renderer);
					$$renderer.push(`<!---->`);
				},
				$$slots: { default: true }
			}
		]));
	});
}
//#endregion
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data, children } = $$props;
		const dashboard = derived(() => data.dashboard);
		const navItems = [
			{
				href: "/",
				label: "Dash",
				caption: "Overview",
				icon: Layout_dashboard
			},
			{
				href: "/tasks",
				label: "Tasks",
				caption: "Kanban",
				icon: Folder_kanban
			},
			{
				href: "/specs",
				label: "Specs",
				caption: "Intent",
				icon: Notebook_text
			},
			{
				href: "/timeline",
				label: "Gantt",
				caption: "Timeline",
				icon: Chart_no_axes_gantt
			}
		];
		const activePath = derived(() => page.url.pathname);
		head("12qhfyh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(dashboard().project.name)} Workspace</title>`);
			});
		});
		$$renderer.push(`<div class="workspace-shell svelte-12qhfyh"><aside class="sidebar svelte-12qhfyh"><div class="brand svelte-12qhfyh"><div class="brand-mark svelte-12qhfyh">`);
		Sparkles($$renderer, {
			size: 16,
			strokeWidth: 1.8
		});
		$$renderer.push(`<!----> <span>spm</span></div> <div class="brand-copy svelte-12qhfyh"><p class="eyebrow svelte-12qhfyh">spec embryo</p> <h1 class="svelte-12qhfyh">${escape_html(dashboard().project.name)}</h1> <p class="brand-summary svelte-12qhfyh">Project memory views with deterministic state underneath.</p></div></div> <nav class="nav-stack svelte-12qhfyh" aria-label="Workspace views"><!--[-->`);
		const each_array = ensure_array_like(navItems);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];
			const Icon = item.icon;
			$$renderer.push(`<a${attr("href", item.href)}${attr_class("svelte-12qhfyh", void 0, { "active": activePath() === item.href })}><span class="nav-badge svelte-12qhfyh">`);
			if (Icon) {
				$$renderer.push("<!--[-->");
				Icon($$renderer, {
					size: 17,
					strokeWidth: 1.9
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(`</span> <span class="nav-copy svelte-12qhfyh"><strong class="svelte-12qhfyh">${escape_html(item.label)}</strong> <small class="svelte-12qhfyh">${escape_html(item.caption)}</small></span></a>`);
		}
		$$renderer.push(`<!--]--></nav> <div class="sidebar-note svelte-12qhfyh"><div class="sidebar-note-head svelte-12qhfyh"><p class="eyebrow svelte-12qhfyh">Memory home</p> <strong class="svelte-12qhfyh">${escape_html(dashboard().project.memoryDir)}</strong></div> <p class="svelte-12qhfyh">${escape_html(dashboard().currentState.summary)}</p></div></aside> <div class="main-column svelte-12qhfyh"><header class="topbar svelte-12qhfyh"><div class="topbar-copy svelte-12qhfyh"><p class="eyebrow svelte-12qhfyh">Current focus</p> <h2 class="svelte-12qhfyh">${escape_html(dashboard().currentState.focus)}</h2></div> <div class="signal-row svelte-12qhfyh"><div class="signal-card svelte-12qhfyh">`);
		Notebook_text($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <span class="svelte-12qhfyh">Specs</span> <strong class="svelte-12qhfyh">${escape_html(dashboard().counts.specs)}</strong></div> <div class="signal-card svelte-12qhfyh">`);
		Folder_kanban($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <span class="svelte-12qhfyh">In Progress</span> <strong class="svelte-12qhfyh">${escape_html(dashboard().counts.inProgressTasks)}</strong></div> <div class="signal-card svelte-12qhfyh">`);
		Chart_no_axes_gantt($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <span class="svelte-12qhfyh">Blocked</span> <strong class="svelte-12qhfyh">${escape_html(dashboard().counts.blockedTasks)}</strong></div> <div${attr_class(`signal-card ${stringify(dashboard().agents.ok ? "signal-ok" : "signal-warn")}`, "svelte-12qhfyh")}>`);
		if (dashboard().agents.ok) {
			$$renderer.push("<!--[0-->");
			Shield_check($$renderer, {
				size: 14,
				strokeWidth: 1.9
			});
		} else {
			$$renderer.push("<!--[-1-->");
			Shield_alert($$renderer, {
				size: 14,
				strokeWidth: 1.9
			});
		}
		$$renderer.push(`<!--]--> <span class="svelte-12qhfyh">AGENTS</span> <strong class="svelte-12qhfyh">${escape_html(dashboard().agents.ok ? "Healthy" : "Watch")}</strong></div></div></header> <main class="view-frame svelte-12qhfyh">`);
		children($$renderer);
		$$renderer.push(`<!----></main></div></div>`);
	});
}
//#endregion
export { _layout as default };
