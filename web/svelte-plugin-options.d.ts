export function isPackagedSvelteApp(configUrl?: string): boolean;

export function buildSvelteVitePluginOptions(configUrl?: string): {
  prebundleSvelteLibraries?: boolean;
};

export function buildPackagedViteOptimizeDeps(configUrl?: string):
  | {
      include: string[];
    }
  | undefined;
