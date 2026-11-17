<script lang="ts">
  import { LaptopMinimal, MoonStar, SunMedium } from "@lucide/svelte";
  import { COLOR_MODES, type ColorMode, type ResolvedTheme } from "../theme.ts";
  let { mode, resolvedTheme, onSelect }: { mode: ColorMode; resolvedTheme: ResolvedTheme; onSelect: (mode: ColorMode) => void } = $props();
  const labels = { system: "System", dark: "Dark", light: "Light" };
  const icons = { system: LaptopMinimal, dark: MoonStar, light: SunMedium };
</script>
<fieldset>
  <legend>Color mode <span>currently {resolvedTheme}</span></legend>
  <div class="theme-options">
    {#each COLOR_MODES as option}
      {@const Icon = icons[option]}
      <button type="button" class:active={mode === option} onclick={() => onSelect(option)} aria-pressed={mode === option}><Icon size={15} />{labels[option]}</button>
    {/each}
  </div>
</fieldset>
<style>
  fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  legend { margin-bottom: .5rem; font-size: .8125rem; }
  legend span { display: block; color: var(--text-muted); font-size: .75rem; }
  .theme-options { display: flex; gap: .25rem; }
  button { display: inline-flex; align-items: center; justify-content: center; gap: .25rem; flex: 1; min-height: 2rem; padding: .375rem; background: var(--surface); border: 1px solid var(--border-control); border-radius: .25rem; cursor: pointer; }
  button:hover { background: var(--surface-raised); }
  button.active { color: var(--accent); background: var(--selection-bg); box-shadow: inset 0 -2px var(--accent); }
  @media (pointer: coarse) { button { min-height: 2.75rem; } }
</style>
