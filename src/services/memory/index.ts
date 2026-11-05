/**
 * Student OS Memory Service (PostgreSQL + pgvector)
 *
 * Implements:
 * 1. 7 user-scoped memory categories
 * 2. 768-d unit-normalized vector embeddings
 * 3. Hybrid semantic & relevance scoring
 * 4. Duplicate memory prevention
 * 5. Review, editing with re-embedding, and user-controlled deletion
 */

import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  generateEmbedding768,
  cosineSimilarity,
  computeContentHash,
  findDuplicateMemory,
  retrieveAndScoreKnowledge,
  normalizeMemoryText,
  computeLexicalScore,
} from "../../lib/memory/engine.ts";
import type {
  StandardMemoryCategory,
  ScoredMemoryRecord,
  ScoredDocumentItem,
} from "../../lib/memory/engine.ts";
import type { MemoryRecordRow, DocumentRow } from "../../types/database.ts";

export {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  generateEmbedding768,
  cosineSimilarity,
  computeContentHash,
  findDuplicateMemory,
  retrieveAndScoreKnowledge,
  normalizeMemoryText,
  computeLexicalScore,
};

export type {
  StandardMemoryCategory,
  StandardMemoryCategory as MemoryCategory,
  ScoredMemoryRecord,
  ScoredDocumentItem,
  MemoryRecordRow,
  DocumentRow,
};
