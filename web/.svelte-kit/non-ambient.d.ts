
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/specs" | "/specs/[specId]" | "/tasks" | "/tasks/[taskId]" | "/timeline";
		RouteParams(): {
			"/specs/[specId]": { specId: string };
			"/tasks/[taskId]": { taskId: string }
		};
		LayoutParams(): {
			"/": { specId?: string; taskId?: string };
			"/specs": { specId?: string };
			"/specs/[specId]": { specId: string };
			"/tasks": { taskId?: string };
			"/tasks/[taskId]": { taskId: string };
			"/timeline": Record<string, never>
		};
		Pathname(): "/" | "/specs" | `/specs/${string}` & {} | "/tasks" | `/tasks/${string}` & {} | "/timeline";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}