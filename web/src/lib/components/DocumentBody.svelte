<script lang="ts">
  import type { DocumentBodySection } from "../../../../src/services/details.ts";

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
  ul {
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
</style>
