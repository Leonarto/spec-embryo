import type {SpecDocument} from "../../../src/domain.ts";
import {serializeTomlFrontmatter} from "../../../src/frontmatter.ts";

export function serializeSpecDocument(spec: SpecDocument, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: spec.docKind,
      id: spec.id,
      title: spec.title,
      summary: spec.summary,
      status: spec.status,
      task_ids: spec.taskIds,
      tags: spec.tags,
      owner: spec.owner,
      updated_at: updatedAt,
    },
    spec.body,
  );
}
