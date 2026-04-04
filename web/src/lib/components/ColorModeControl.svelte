<script lang="ts">
  import { LaptopMinimal, MoonStar, SunMedium } from "@lucide/svelte";
  import { COLOR_MODES, type ColorMode, type ResolvedTheme } from "../theme.ts";

  type Props = {
    mode: ColorMode;
    resolvedTheme: ResolvedTheme;
    onSelect: (mode: ColorMode) => void;
  };

  let { mode, resolvedTheme, onSelect }: Props = $props();

  const modeMeta: Record<ColorMode, { label: string; detail: string; icon: typeof LaptopMinimal }> = {
    system: {
      label: "System",
      detail: "Follow OS, fallback dark",
      icon: LaptopMinimal,
    },
    dark: {
      label: "Dark",
      detail: "Editorial night mode",
      icon: MoonStar,
    },
    light: {
      label: "Light",
      detail: "Paper day mode",
      icon: SunMedium,
    },
  };
</script>

<section class="theme-panel" aria-label="Color mode">
  <div class="theme-copy">
    <p class="theme-eyebrow">Color mode</p>
    <div class="theme-title-row">
      <strong>{modeMeta[mode].label}</strong>
      <span class="theme-resolved">{resolvedTheme}</span>
    </div>
    <p class="theme-detail">{modeMeta[mode].detail}</p>
  </div>

  <div class="theme-options" role="list">
    {#each COLOR_MODES as option}
      {@const meta = modeMeta[option]}
      {@const Icon = meta.icon}
      <button
        type="button"
        class:active={mode === option}
        class="theme-option"
        onclick={() => onSelect(option)}
        aria-pressed={mode === option}
      >
        <span class="theme-option-icon">
          <Icon size={14} strokeWidth={1.9} />
        </span>
        <span class="theme-option-copy">
          <span>{meta.label}</span>
          <small>{meta.detail}</small>
        </span>
      </button>
    {/each}
  </div>
</section>

<style>
  .theme-panel {
    display: grid;
    gap: 0.7rem;
    padding: 0.8rem;
    border-radius: 1.15rem;
    border: 1px solid var(--line);
    background: var(--panel-muted);
    box-shadow: var(--shadow-soft);
  }

  .theme-copy {
    display: grid;
    gap: 0.22rem;
  }

  .theme-eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
    color: var(--muted);
  }

  .theme-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .theme-title-row strong {
    font-size: 0.94rem;
    line-height: 1.2;
  }

  .theme-resolved {
    padding: 0.18rem 0.48rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--panel-strong);
    color: var(--muted-soft);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.11em;
  }

  .theme-detail {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .theme-options {
    display: grid;
    gap: 0.42rem;
  }

  .theme-option {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.58rem;
    width: 100%;
    padding: 0.48rem 0.54rem;
    border-radius: 0.98rem;
    border: 1px solid transparent;
    background: color-mix(in srgb, var(--surface-card-soft) 34%, transparent);
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background 120ms ease,
      box-shadow 120ms ease;
  }

  .theme-option:hover,
  .theme-option.active {
    transform: translateX(1px);
    border-color: var(--line-strong);
    background: var(--panel-strong);
    box-shadow: var(--shadow-soft);
  }

  .theme-option.active {
    background: var(--accent-soft);
    box-shadow:
      var(--shadow-soft),
      0 0 22px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .theme-option-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.72rem;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel-strong) 78%, transparent);
    color: var(--muted-soft);
  }

  .theme-option-copy {
    display: grid;
    min-width: 0;
  }

  .theme-option-copy span {
    font-size: 0.84rem;
    line-height: 1.15;
  }

  .theme-option-copy small {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.3;
  }
</style>
