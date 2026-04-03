import { _ as escape_html, c as ensure_array_like, d as spread_props, f as stringify, l as head, o as derived, r as attr_class } from "../../chunks/index-server.js";
import { t as Icon } from "../../chunks/Icon.js";
import { n as Arrow_right, t as Clock_3 } from "../../chunks/clock-3.js";
import { t as Blocks } from "../../chunks/blocks.js";
import { n as Shield_alert, r as Chart_no_axes_gantt, t as Shield_check } from "../../chunks/shield-check.js";
import { t as Folder_kanban } from "../../chunks/folder-kanban.js";
import { n as Notebook_text, t as Sparkles } from "../../chunks/sparkles.js";
//#region node_modules/@lucide/svelte/dist/icons/git-branch.svelte
function Git_branch($$renderer, $$props) {
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
			{ name: "git-branch" },
			props,
			{
				iconNode: [
					["path", { "d": "M15 6a9 9 0 0 0-9 9V3" }],
					["circle", {
						"cx": "18",
						"cy": "6",
						"r": "3"
					}],
					["circle", {
						"cx": "6",
						"cy": "18",
						"r": "3"
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
//#region node_modules/@lucide/svelte/dist/icons/target.svelte
function Target($$renderer, $$props) {
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
			{ name: "target" },
			props,
			{
				iconNode: [
					["circle", {
						"cx": "12",
						"cy": "12",
						"r": "10"
					}],
					["circle", {
						"cx": "12",
						"cy": "12",
						"r": "6"
					}],
					["circle", {
						"cx": "12",
						"cy": "12",
						"r": "2"
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
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const dashboard = derived(() => data.dashboard);
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(dashboard().project.name)} Dash</title>`);
			});
		});
		$$renderer.push(`<section class="hero-grid svelte-1uha8ag"><article class="hero-card svelte-1uha8ag"><div class="hero-head svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Workspace overview</p> <h3 class="svelte-1uha8ag">Dash</h3></div> <span class="icon-seal svelte-1uha8ag">`);
		Sparkles($$renderer, {
			size: 18,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span></div> <p class="hero-copy svelte-1uha8ag">${escape_html(dashboard().currentState.summary)}</p> <div class="chip-row svelte-1uha8ag"><span class="chip chip-accent svelte-1uha8ag">`);
		Notebook_text($$renderer, {
			size: 13,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> ${escape_html(dashboard().project.memoryDir)}</span> `);
		if (dashboard().git.available) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="chip svelte-1uha8ag">`);
			Git_branch($$renderer, {
				size: 13,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> ${escape_html(dashboard().git.branch ?? "unknown")} · ${escape_html(dashboard().git.dirty ? "dirty" : "clean")}</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <span class="chip svelte-1uha8ag">`);
		Notebook_text($$renderer, {
			size: 13,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> ${escape_html(dashboard().counts.specs)} specs</span> <span class="chip svelte-1uha8ag">`);
		Folder_kanban($$renderer, {
			size: 13,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> ${escape_html(dashboard().counts.tasks)} tasks</span></div></article> <article class="stats-card svelte-1uha8ag"><div class="stats-grid svelte-1uha8ag"><div class="svelte-1uha8ag"><span class="svelte-1uha8ag">Active specs</span> <strong class="svelte-1uha8ag">${escape_html(dashboard().counts.activeSpecs)}</strong></div> <div class="svelte-1uha8ag"><span class="svelte-1uha8ag">In progress</span> <strong class="svelte-1uha8ag">${escape_html(dashboard().counts.inProgressTasks)}</strong></div> <div class="svelte-1uha8ag"><span class="svelte-1uha8ag">Blocked</span> <strong class="svelte-1uha8ag">${escape_html(dashboard().counts.blockedTasks)}</strong></div> <div class="svelte-1uha8ag"><span class="svelte-1uha8ag">Review</span> <strong class="svelte-1uha8ag">${escape_html(dashboard().counts.reviewTasks)}</strong></div> <div class="svelte-1uha8ag"><span class="svelte-1uha8ag">Ready</span> <strong class="svelte-1uha8ag">${escape_html(dashboard().counts.readyTasks)}</strong></div></div></article></section> <section class="dashboard-grid svelte-1uha8ag"><article class="panel panel-wide svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		Target($$renderer, {
			size: 16,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span> <div><p class="eyebrow svelte-1uha8ag">Current state</p> <h3 class="svelte-1uha8ag">Focus and next actions</h3></div></div></div> <div class="focus-grid svelte-1uha8ag"><div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Target($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Focus</h4></div> <p class="svelte-1uha8ag">${escape_html(dashboard().currentState.focus)}</p></div> <div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Notebook_text($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Active specs</h4></div> <div class="chip-row svelte-1uha8ag"><!--[-->`);
		const each_array = ensure_array_like(dashboard().currentState.activeSpecIds);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let specId = each_array[$$index];
			$$renderer.push(`<span class="chip svelte-1uha8ag">${escape_html(specId)}</span>`);
		}
		$$renderer.push(`<!--]--></div></div> <div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Folder_kanban($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Active tasks</h4></div> <div class="chip-row svelte-1uha8ag"><!--[-->`);
		const each_array_1 = ensure_array_like(dashboard().currentState.activeTaskIds);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let taskId = each_array_1[$$index_1];
			$$renderer.push(`<span class="chip svelte-1uha8ag">${escape_html(taskId)}</span>`);
		}
		$$renderer.push(`<!--]--></div></div></div> <ol class="action-list svelte-1uha8ag"><!--[-->`);
		const each_array_2 = ensure_array_like(dashboard().nextActions);
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let action = each_array_2[$$index_2];
			$$renderer.push(`<li class="svelte-1uha8ag">`);
			Arrow_right($$renderer, {
				size: 14,
				strokeWidth: 2
			});
			$$renderer.push(`<!----> <span>${escape_html(action)}</span></li>`);
		}
		$$renderer.push(`<!--]--></ol></article> <article class="panel svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		if (dashboard().agents.ok) {
			$$renderer.push("<!--[0-->");
			Shield_check($$renderer, {
				size: 16,
				strokeWidth: 1.9
			});
		} else {
			$$renderer.push("<!--[-1-->");
			Shield_alert($$renderer, {
				size: 16,
				strokeWidth: 1.9
			});
		}
		$$renderer.push(`<!--]--></span> <div><p class="eyebrow svelte-1uha8ag">Agents</p> <h3 class="svelte-1uha8ag">AGENTS health</h3></div></div></div> <div${attr_class(`health-card ${stringify(dashboard().agents.ok ? "ok" : "warn")}`, "svelte-1uha8ag")}><strong>${escape_html(dashboard().agents.ok ? "Healthy" : "Needs attention")}</strong> <p class="svelte-1uha8ag">max file ${escape_html(dashboard().agents.maxFileTokens)} · max chain ${escape_html(dashboard().agents.maxChainTokens)}</p></div> `);
		if (dashboard().agents.failures.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<ul class="notes-list svelte-1uha8ag"><!--[-->`);
			const each_array_3 = ensure_array_like(dashboard().agents.failures);
			for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
				let failure = each_array_3[$$index_3];
				$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(failure)}</li>`);
			}
			$$renderer.push(`<!--]--></ul>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></article> <article class="panel svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		Clock_3($$renderer, {
			size: 16,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span> <div><p class="eyebrow svelte-1uha8ag">Resume</p> <h3 class="svelte-1uha8ag">Recent handoff</h3></div></div></div> `);
		if (dashboard().recentHandoff) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
			Clock_3($$renderer, {
				size: 14,
				strokeWidth: 1.9
			});
			$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">${escape_html(dashboard().recentHandoff.id)}</h4></div> <p class="svelte-1uha8ag">${escape_html(dashboard().recentHandoff.title)}</p> <small class="svelte-1uha8ag">${escape_html(dashboard().recentHandoff.createdAt)}</small></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<p class="empty svelte-1uha8ag">No handoff exists yet.</p>`);
		}
		$$renderer.push(`<!--]--></article> <article class="panel svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		Blocks($$renderer, {
			size: 16,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span> <div><p class="eyebrow svelte-1uha8ag">Execution</p> <h3 class="svelte-1uha8ag">Blocked work</h3></div></div></div> `);
		if (dashboard().blockedTasks.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="empty svelte-1uha8ag">No blocked tasks right now.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<ul class="notes-list svelte-1uha8ag"><!--[-->`);
			const each_array_4 = ensure_array_like(dashboard().blockedTasks);
			for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
				let task = each_array_4[$$index_4];
				$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(task.id)} · ${escape_html(task.title)}</li>`);
			}
			$$renderer.push(`<!--]--></ul>`);
		}
		$$renderer.push(`<!--]--></article> <article class="panel svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		Chart_no_axes_gantt($$renderer, {
			size: 16,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span> <div><p class="eyebrow svelte-1uha8ag">Execution</p> <h3 class="svelte-1uha8ag">Critical path</h3></div></div></div> <ul class="notes-list svelte-1uha8ag"><!--[-->`);
		const each_array_5 = ensure_array_like(dashboard().criticalPath);
		for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
			let task = each_array_5[$$index_5];
			$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(task.id)} · ${escape_html(task.title)}</li>`);
		}
		$$renderer.push(`<!--]--></ul></article> <article class="panel panel-wide svelte-1uha8ag"><div class="panel-head svelte-1uha8ag"><div class="panel-title svelte-1uha8ag"><span class="icon-seal icon-soft svelte-1uha8ag">`);
		Sparkles($$renderer, {
			size: 16,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----></span> <div><p class="eyebrow svelte-1uha8ag">What does not fit elsewhere</p> <h3 class="svelte-1uha8ag">Signals and notes</h3></div></div></div> <div class="signal-grid svelte-1uha8ag"><div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Arrow_right($$renderer, {
			size: 14,
			strokeWidth: 2
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Current-state hints</h4></div> <ul class="notes-list svelte-1uha8ag"><!--[-->`);
		const each_array_6 = ensure_array_like(dashboard().currentState.nextActionHints);
		for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
			let hint = each_array_6[$$index_6];
			$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(hint)}</li>`);
		}
		$$renderer.push(`<!--]--></ul></div> <div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Blocks($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Dependency issues</h4></div> `);
		if (dashboard().dependencyIssues.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="svelte-1uha8ag">No missing dependencies detected.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<ul class="notes-list svelte-1uha8ag"><!--[-->`);
			const each_array_7 = ensure_array_like(dashboard().dependencyIssues);
			for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
				let issue = each_array_7[$$index_7];
				$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(issue.taskId)} references missing ${escape_html(issue.missingTaskId)}</li>`);
			}
			$$renderer.push(`<!--]--></ul>`);
		}
		$$renderer.push(`<!--]--></div> <div class="focus-card svelte-1uha8ag"><div class="mini-head svelte-1uha8ag">`);
		Notebook_text($$renderer, {
			size: 14,
			strokeWidth: 1.9
		});
		$$renderer.push(`<!----> <h4 class="svelte-1uha8ag">Spec coverage snapshot</h4></div> <ul class="notes-list svelte-1uha8ag"><!--[-->`);
		const each_array_8 = ensure_array_like(dashboard().specs);
		for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
			let spec = each_array_8[$$index_8];
			$$renderer.push(`<li class="svelte-1uha8ag">${escape_html(spec.id)} · ${escape_html(spec.linkedTaskCount)} linked tasks</li>`);
		}
		$$renderer.push(`<!--]--></ul></div></div></article></section>`);
	});
}
//#endregion
export { _page as default };
