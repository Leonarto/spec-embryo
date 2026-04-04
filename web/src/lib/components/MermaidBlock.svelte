<script lang="ts">
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2.2;
  const ZOOM_STEP = 0.2;

  let { source } = $props<{ source: string }>();

  let svgMarkup = $state("");
  let error = $state<string | null>(null);
  let isRendering = $state(true);
  let zoom = $state(1);

  function clampZoom(next: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.parseFloat(next.toFixed(2))));
  }

  function zoomIn() {
    zoom = clampZoom(zoom + ZOOM_STEP);
  }

  function zoomOut() {
    zoom = clampZoom(zoom - ZOOM_STEP);
  }

  function resetZoom() {
    zoom = 1;
  }

  async function renderDiagram(input: string) {
    if (typeof window === "undefined") {
      return;
    }

    isRendering = true;
    error = null;

    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#f5f0e6",
          primaryBorderColor: "#2e6a52",
          primaryTextColor: "#1d271f",
          lineColor: "#2e6a52",
          tertiaryColor: "#fffdf8",
          background: "#fffdf8",
          mainBkg: "#f8f2e8",
          nodeBorder: "#2e6a52",
          clusterBkg: "#f7f4ed",
          clusterBorder: "#c9bcaa",
          fontFamily: "var(--body-font)",
        },
        flowchart: {
          curve: "basis",
          useMaxWidth: true,
          htmlLabels: true,
        },
      });

      const id = `spm-mermaid-${Math.random().toString(36).slice(2, 10)}`;
      const { svg } = await mermaid.render(id, input);
      svgMarkup = svg;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      error = `Mermaid could not render this diagram: ${message}`;
      svgMarkup = "";
    } finally {
      isRendering = false;
    }
  }

  $effect(() => {
    void renderDiagram(source);
  });
</script>

<div class="diagram-shell">
  <div class="diagram-head">
    <div class="diagram-meta">
      <span class="diagram-label">Diagram</span>
      <span class="diagram-kind">Mermaid</span>
    </div>

    <div class="diagram-controls" aria-label="Diagram zoom controls">
      <button type="button" class="control-button" onclick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
        -
      </button>
      <button type="button" class="control-readout" onclick={resetZoom} aria-label="Reset zoom">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" class="control-button" onclick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
        +
      </button>
    </div>
  </div>

  {#if error}
    <div class="diagram-error">
      <p>{error}</p>
      <pre>{source}</pre>
    </div>
  {:else if isRendering && !svgMarkup}
    <div class="diagram-loading">Rendering Mermaid diagram…</div>
  {:else}
    <div class="diagram-stage">
      <div class="diagram-canvas" style={`--diagram-scale: ${zoom};`}>
        {@html svgMarkup}
      </div>
    </div>
  {/if}
</div>

<style>
  .diagram-shell {
    display: grid;
    gap: 0.85rem;
    padding: 0.9rem;
    border-radius: calc(var(--radius-lg) - 0.15rem);
    border: 1px solid rgba(46, 106, 82, 0.18);
    background:
      linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(247, 242, 233, 0.95)),
      radial-gradient(circle at top left, rgba(46, 106, 82, 0.07), transparent 48%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 18px 40px rgba(34, 28, 20, 0.08);
  }

  .diagram-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .diagram-meta,
  .diagram-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .diagram-label,
  .diagram-kind {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.68rem;
  }

  .diagram-label {
    color: var(--muted);
  }

  .diagram-kind {
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(46, 106, 82, 0.24);
    color: #20674c;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 0 16px rgba(46, 106, 82, 0.12);
  }

  .diagram-controls {
    margin-left: auto;
  }

  .control-button,
  .control-readout {
    border: 1px solid rgba(46, 106, 82, 0.2);
    background: rgba(255, 255, 255, 0.74);
    color: #1d271f;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.72),
      0 0 18px rgba(46, 106, 82, 0.08);
  }

  .control-button {
    width: 1.95rem;
    height: 1.95rem;
    padding: 0;
    border-radius: 999px;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }

  .control-readout {
    padding: 0.34rem 0.62rem;
    border-radius: 999px;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .control-button:disabled {
    opacity: 0.42;
    cursor: default;
    box-shadow: none;
  }

  .diagram-loading,
  .diagram-error p {
    margin: 0;
    color: var(--muted);
  }

  .diagram-stage {
    overflow: auto;
    resize: both;
    min-width: min(18rem, 100%);
    min-height: 15rem;
    width: 100%;
    max-width: 100%;
    max-height: 38rem;
    padding: 0.2rem 0.1rem 0.1rem;
    border-radius: 0.9rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(250, 245, 236, 0.62));
  }

  .diagram-canvas {
    display: grid;
    justify-items: center;
    align-items: start;
    width: max-content;
    min-width: 100%;
    padding: 0.35rem 0.15rem 0.1rem;
    transform: scale(var(--diagram-scale, 1));
    transform-origin: top left;
  }

  .diagram-canvas :global(svg) {
    display: block;
    width: auto;
    max-width: none;
    height: auto;
  }

  .diagram-error {
    display: grid;
    gap: 0.6rem;
  }

  .diagram-error pre {
    margin: 0;
    overflow-x: auto;
    padding: 0.9rem;
    border-radius: 0.9rem;
    background: rgba(36, 33, 28, 0.96);
    color: rgba(245, 238, 225, 0.92);
    font-size: 0.85rem;
    line-height: 1.55;
  }
</style>
