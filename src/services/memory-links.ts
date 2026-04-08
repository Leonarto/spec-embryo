import type { ProjectContext } from "../domain.ts";
import { buildMemoryIndex, type MemoryDocKind, type MemoryIndex } from "./memory-index.ts";

export type MemoryRelationType =
  | "spec-task"
  | "task-spec"
  | "task-depends-on"
  | "task-blocked-by"
  | "current-active-spec"
  | "current-active-task"
  | "current-blocked-task"
  | "current-last-handoff"
  | "handoff-active-task"
  | "handoff-related-spec";

export interface MemoryRelation {
  fromId: string;
  fromKind: MemoryDocKind;
  toId: string;
  toKind?: MemoryDocKind;
  relation: MemoryRelationType;
  sourceField: string;
}

export interface MemoryLinkGraph {
  index: MemoryIndex;
  relations: MemoryRelation[];
  outgoingById: Map<string, MemoryRelation[]>;
  incomingById: Map<string, MemoryRelation[]>;
}

export interface MemoryNeighborhood {
  centerId: string;
  depth: number;
  documentIds: string[];
  relations: MemoryRelation[];
}

function compareRelations(left: MemoryRelation, right: MemoryRelation): number {
  return (
    left.fromId.localeCompare(right.fromId) ||
    left.toId.localeCompare(right.toId) ||
    left.relation.localeCompare(right.relation) ||
    left.sourceField.localeCompare(right.sourceField)
  );
}

function sortRelationBuckets(bucket: Map<string, MemoryRelation[]>): Map<string, MemoryRelation[]> {
  for (const [id, relations] of bucket) {
    bucket.set(id, [...relations].sort(compareRelations));
  }

  return bucket;
}

function pushRelation(
  relations: MemoryRelation[],
  index: MemoryIndex,
  input: Omit<MemoryRelation, "toKind">,
): void {
  relations.push({
    ...input,
    toKind: index.byId.get(input.toId)?.docKind,
  });
}

function buildRelations(index: MemoryIndex): MemoryRelation[] {
  const relations: MemoryRelation[] = [];

  for (const entry of index.entries) {
    const document = entry.document;

    switch (document.docKind) {
      case "spec":
        for (const taskId of document.taskIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: taskId,
            relation: "spec-task",
            sourceField: "task_ids",
          });
        }
        break;
      case "task":
        for (const specId of document.specIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: specId,
            relation: "task-spec",
            sourceField: "spec_ids",
          });
        }

        for (const dependencyId of document.dependsOn) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: dependencyId,
            relation: "task-depends-on",
            sourceField: "depends_on",
          });
        }

        for (const blockerId of document.blockedBy) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: blockerId,
            relation: "task-blocked-by",
            sourceField: "blocked_by",
          });
        }
        break;
      case "current-state":
        for (const specId of document.activeSpecIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: specId,
            relation: "current-active-spec",
            sourceField: "active_spec_ids",
          });
        }

        for (const taskId of document.activeTaskIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: taskId,
            relation: "current-active-task",
            sourceField: "active_task_ids",
          });
        }

        for (const taskId of document.blockedTaskIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: taskId,
            relation: "current-blocked-task",
            sourceField: "blocked_task_ids",
          });
        }

        if (document.lastHandoffId) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: document.lastHandoffId,
            relation: "current-last-handoff",
            sourceField: "last_handoff_id",
          });
        }
        break;
      case "handoff":
        for (const taskId of document.activeTaskIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: taskId,
            relation: "handoff-active-task",
            sourceField: "active_task_ids",
          });
        }

        for (const specId of document.relatedSpecIds) {
          pushRelation(relations, index, {
            fromId: document.id,
            fromKind: document.docKind,
            toId: specId,
            relation: "handoff-related-spec",
            sourceField: "related_spec_ids",
          });
        }
        break;
    }
  }

  return relations.sort(compareRelations);
}

function buildRelationMap(
  relations: MemoryRelation[],
  keySelector: (relation: MemoryRelation) => string,
): Map<string, MemoryRelation[]> {
  const buckets = new Map<string, MemoryRelation[]>();

  for (const relation of relations) {
    const key = keySelector(relation);
    const existing = buckets.get(key) ?? [];
    existing.push(relation);
    buckets.set(key, existing);
  }

  return sortRelationBuckets(buckets);
}

export function buildMemoryLinkGraph(context: ProjectContext): MemoryLinkGraph {
  const index = buildMemoryIndex(context);
  const relations = buildRelations(index);

  return {
    index,
    relations,
    outgoingById: buildRelationMap(relations, (relation) => relation.fromId),
    incomingById: buildRelationMap(relations, (relation) => relation.toId),
  };
}

export function getOutgoingMemoryRelations(graph: MemoryLinkGraph, docId: string): MemoryRelation[] {
  return graph.outgoingById.get(docId) ?? [];
}

export function getIncomingMemoryRelations(graph: MemoryLinkGraph, docId: string): MemoryRelation[] {
  return graph.incomingById.get(docId) ?? [];
}

export function buildMemoryNeighborhood(
  graph: MemoryLinkGraph,
  centerId: string,
  options?: { depth?: number },
): MemoryNeighborhood {
  const depth = Math.max(1, options?.depth ?? 1);
  const discovered = new Set([centerId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];
  const relations = new Map<string, MemoryRelation>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= depth) {
      continue;
    }

    const localRelations = [
      ...getOutgoingMemoryRelations(graph, current.id),
      ...getIncomingMemoryRelations(graph, current.id),
    ].sort(compareRelations);

    for (const relation of localRelations) {
      relations.set(
        `${relation.fromId}:${relation.toId}:${relation.relation}:${relation.sourceField}`,
        relation,
      );

      const neighborId = relation.fromId === current.id ? relation.toId : relation.fromId;
      if (discovered.has(neighborId)) {
        continue;
      }

      discovered.add(neighborId);
      queue.push({ id: neighborId, depth: current.depth + 1 });
    }
  }

  return {
    centerId,
    depth,
    documentIds: Array.from(discovered).sort((left, right) => left.localeCompare(right)),
    relations: Array.from(relations.values()).sort(compareRelations),
  };
}
