<script lang="ts">
  import type { DocumentBodySection } from "../../../../src/services/details.ts";
  import MermaidBlock from "./MermaidBlock.svelte";

  let { sections, emptyLabel = "No narrative body yet." } = $props<{
    sections: DocumentBodySection[];
    emptyLabel?: string;
  }>();
</script>

{#if sections.length === 0}
  <p class="empty">{emptyLabel}</p>
{:else}
  <div class="body-sections">
    {#each sections as section}
      <section class="body-section">
        <div class="section-head">
          <span class="section-rule"></span>
          <h3>{section.heading}</h3>
        </div>

        <div class="section-content">
          {#each section.blocks as block}
            {#if block.kind === "paragraph"}
              {#each block.lines as line}
                <p>{line}</p>
              {/each}
            {:else if block.kind === "list"}
              <ul>
                {#each block.lines as line}
                  <li>{line}</li>
                {/each}
              </ul>
            {:else if block.kind === "code"}
              {#if block.language === "mermaid"}
                <MermaidBlock source={block.lines.join("\n")} />
              {:else}
                <div class="code-shell">
                  <div class="code-head">
                    <span class="code-label">Code block</span>
                    {#if block.language}
                      <span class="code-language">{block.language}</span>
                    {/if}
                  </div>
                  <pre><code>{block.lines.join("\n")}</code></pre>
                </div>
              {/if}
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  .empty,
  p,
  li {
    color: var(--muted);
    line-height: 1.6;
  }

  .body-sections {
    display: grid;
    gap: 1rem;
  }

  .body-section {
    display: grid;
    gap: 0.72rem;
    padding: 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    background: var(--surface-card-soft);
    box-shadow: var(--shadow-soft);
  }

  .section-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-rule {
    width: 1.65rem;
    height: 0.18rem;
    border-radius: 999px;
    background:var(--accent);
  }

  h3,
  p,
  ul,
  pre {
    margin: 0;
  }

  h3 {
    font-family:var(--body-font);
    font-size: 1.08rem;
  }

  .section-content {
    display: grid;
    gap: 0.7rem;
  }

  ul {
    padding-left: 1.1rem;
  }

  li + li {
    margin-top: 0.32rem;
  }

  .code-shell {
    display: grid;
    gap: 0.7rem;
    padding: 0.85rem;
    border-radius:.25rem;
    border: 1px solid var(--code-border);
    background:var(--code-bg);
    box-shadow:none;
  }

  .code-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .code-label,
  .code-language {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.68rem;
  }

  .code-label {
    color: var(--code-label);
  }

  .code-language {
    padding: 0.26rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--code-pill-border);
    color: var(--code-pill-ink);
    background: var(--code-pill-bg);
  }

  pre {
    overflow-x: auto;
  }

  code {
    font-family:var(--mono-font);
    color: var(--code-ink);
    font-size: 0.88rem;
    line-height: 1.6;
    white-space: pre;
  }
</style>
