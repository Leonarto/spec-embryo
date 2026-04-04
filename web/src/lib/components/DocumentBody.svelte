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
    background: rgba(255, 255, 255, 0.76);
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
    background: linear-gradient(90deg, rgba(15, 141, 96, 0.9), rgba(15, 141, 96, 0.2));
  }

  h3,
  p,
  ul,
  pre {
    margin: 0;
  }

  h3 {
    font-family: var(--display-font);
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
    border-radius: 0.95rem;
    border: 1px solid rgba(41, 38, 30, 0.1);
    background:
      linear-gradient(180deg, rgba(43, 39, 31, 0.98), rgba(28, 25, 20, 0.98)),
      radial-gradient(circle at top left, rgba(255, 255, 255, 0.06), transparent 45%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
    color: rgba(229, 221, 205, 0.6);
  }

  .code-language {
    padding: 0.26rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 248, 238, 0.88);
    background: rgba(255, 255, 255, 0.06);
  }

  pre {
    overflow-x: auto;
  }

  code {
    font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
    color: rgba(247, 241, 231, 0.9);
    font-size: 0.88rem;
    line-height: 1.6;
    white-space: pre;
  }
</style>
