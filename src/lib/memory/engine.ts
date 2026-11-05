import type { DocumentRow, MemoryRecordRow } from "../../types/database.ts";

export const MEMORY_CATEGORIES = [
  "student_preference",
  "academic_context",
  "career_goal",
  "active_project",
  "previous_decision",
  "conversation_summary",
  "document_knowledge",
] as const;

export type StandardMemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABELS: Record<StandardMemoryCategory, string> = {
  student_preference: "Student Preferences",
  academic_context: "Academic Context",
  career_goal: "Career Goals",
  active_project: "Active Projects",
  previous_decision: "Relevant Previous Decisions",
  conversation_summary: "Conversation Summaries",
  document_knowledge: "Document Retrieval",
};

export interface ScoredMemoryRecord {
  record: MemoryRecordRow;
  similarityScore: number;
  lexicalScore: number;
  importanceScore: number;
  relevanceScore: number;
  matchReason: string;
}

export interface ScoredDocumentItem {
  document: DocumentRow;
  similarityScore: number;
  lexicalScore: number;
  relevanceScore: number;
  matchedTerms: string[];
}

const SEMANTIC_CONCEPT_CLUSTERS: Record<string, string[]> = {
  academic: [
    "course",
    "subject",
    "syllabus",
    "semester",
    "exam",
    "assignment",
    "gpa",
    "cgpa",
    "grade",
    "lecture",
    "cs301",
    "cs302",
    "cs303",
    "algorithms",
    "operating",
    "database",
    "revision",
    "unit",
  ],
  preference: [
    "prefer",
    "preference",
    "habit",
    "schedule",
    "pomodoro",
    "morning",
    "evening",
    "hours",
    "language",
    "timezone",
    "style",
    "routine",
    "sleep",
  ],
  career: [
    "career",
    "internship",
    "job",
    "role",
    "resume",
    "interview",
    "skill",
    "engineer",
    "ai",
    "ml",
    "systems",
    "placement",
    "fellowship",
    "opportunity",
  ],
  project: [
    "project",
    "portfolio",
    "github",
    "repository",
    "architecture",
    "rag",
    "typescript",
    "nextjs",
    "supabase",
    "pgvector",
    "deploy",
    "milestone",
    "benchmark",
  ],
  decision: [
    "decision",
    "decided",
    "approved",
    "approval",
    "selected",
    "prioritized",
    "plan",
    "roadmap",
    "strategy",
    "outreach",
  ],
  conversation: [
    "conversation",
    "chat",
    "session",
    "summary",
    "discussed",
    "ceo",
    "asked",
    "briefing",
  ],
  document: [
    "paper",
    "pdf",
    "document",
    "research",
    "citation",
    "arxiv",
    "theorem",
    "notes",
    "flashcard",
    "attention",
    "distributed",
  ],
};

/**
 * Normalizes text for duplicate detection and hashing.
 */
export function normalizeMemoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes a deterministic content fingerprint hash for duplicate prevention.
 */
export function computeContentHash(content: string): string {
  const norm = normalizeMemoryText(content);
  let h1 = 0xdeadbeef ^ norm.length;
  let h2 = 0x41c6ce57 ^ norm.length;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `mhash_${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

/**
 * Generates a normalized 768-dimensional embedding vector compatible with
 * PostgreSQL `pgvector` `vector(768)` column type.
 * Uses token FNV-1a projections, character trigrams, and semantic domain
 * cluster activations so semantically related phrases have high cosine similarity.
 */
export function generateEmbedding768(text: string): number[] {
  const DIM = 768;
  const vec = new Float64Array(DIM);
  const normalized = normalizeMemoryText(text);
  if (!normalized) {
    vec[0] = 1;
    return Array.from(vec);
  }

  const tokens = normalized.split(" ").filter((t) => t.length > 1);

  // 1. Token & Stemmed Prefix Projections (dimensions 0..639)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const stem = token.length > 5 ? token.slice(0, 5) : token;

    for (const unit of [token, stem]) {
      let hash = 2166136261;
      for (let c = 0; c < unit.length; c++) {
        hash ^= unit.charCodeAt(c);
        hash = Math.imul(hash, 16777619);
      }
      const idx1 = Math.abs(hash) % 640;
      const idx2 = Math.abs(Math.imul(hash, 31)) % 640;
      const sign = (hash & 1) === 0 ? 1.0 : -1.0;
      vec[idx1] += 1.2 * sign;
      vec[idx2] += 0.6 * sign;
    }

    // Bigram context
    if (i + 1 < tokens.length) {
      const bigram = `${token}_${tokens[i + 1]}`;
      let bHash = 2166136261;
      for (let c = 0; c < bigram.length; c++) {
        bHash ^= bigram.charCodeAt(c);
        bHash = Math.imul(bHash, 16777619);
      }
      const bIdx = Math.abs(bHash) % 640;
      vec[bIdx] += 0.75;
    }
  }

  // 2. Semantic Domain Concept Anchors (dimensions 640..767)
  const clusterKeys = Object.keys(SEMANTIC_CONCEPT_CLUSTERS);
  clusterKeys.forEach((clusterName, clusterIdx) => {
    const keywords = SEMANTIC_CONCEPT_CLUSTERS[clusterName];
    let hits = 0;
    for (const token of tokens) {
      if (
        keywords.some(
          (kw) => token === kw || token.startsWith(kw) || kw.startsWith(token)
        )
      ) {
        hits += 1;
      }
    }
    if (hits > 0) {
      const baseDim = 640 + clusterIdx * 16;
      const strength = Math.min(3.0, hits * 0.9);
      for (let offset = 0; offset < 16 && baseDim + offset < DIM; offset++) {
        vec[baseDim + offset] += strength / (1 + offset * 0.15);
      }
    }
  });

  // L2 Normalization to unit sphere for exact cosine dot product
  let normSq = 0;
  for (let i = 0; i < DIM; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  const result = new Array<number>(DIM);
  for (let i = 0; i < DIM; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }
  return result;
}

/**
 * Computes cosine similarity in [-1, 1] (clamped to [0, 1] for relevance scoring)
 * between two 768-dimensional vectors.
 */
export function cosineSimilarity(
  vecA: number[] | null | undefined,
  vecB: number[] | null | undefined
): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * Checks whether a candidate memory is a duplicate of an existing memory
 * belonging to the same user via exact content hash OR high semantic cosine
 * similarity (>= 0.92).
 */
export function findDuplicateMemory(
  candidateContent: string,
  candidateCategory: string,
  existingUserMemories: MemoryRecordRow[],
  similarityThreshold = 0.92
): {
  isDuplicate: boolean;
  duplicateRecord: MemoryRecordRow | null;
  similarity: number;
  reason?: string;
} {
  const candidateHash = computeContentHash(candidateContent);
  const candidateNorm = normalizeMemoryText(candidateContent);
  const candidateEmbedding = generateEmbedding768(candidateContent);

  for (const existing of existingUserMemories) {
    if (existing.review_status === "archived") continue;

    const existingHash =
      existing.content_hash || computeContentHash(existing.content);
    if (existingHash === candidateHash) {
      return {
        isDuplicate: true,
        duplicateRecord: existing,
        similarity: 1.0,
        reason: "Exact normalized content match",
      };
    }

    const existingNorm = normalizeMemoryText(existing.content);
    if (existingNorm === candidateNorm) {
      return {
        isDuplicate: true,
        duplicateRecord: existing,
        similarity: 1.0,
        reason: "Identical normalized text",
      };
    }

    if (existing.category === candidateCategory) {
      const existingEmb =
        existing.embedding && existing.embedding.length === 768
          ? existing.embedding
          : generateEmbedding768(existing.content);
      const sim = cosineSimilarity(candidateEmbedding, existingEmb);
      if (sim >= similarityThreshold) {
        return {
          isDuplicate: true,
          duplicateRecord: existing,
          similarity: Number(sim.toFixed(3)),
          reason: `Semantic vector similarity (${Math.round(
            sim * 100
          )}%) exceeds duplicate threshold`,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    duplicateRecord: null,
    similarity: 0,
  };
}

/**
 * Computes lexical token overlap between a query and target text.
 */
export function computeLexicalScore(query: string, target: string): {
  score: number;
  matchedTerms: string[];
} {
  const qNorm = normalizeMemoryText(query);
  if (!qNorm) return { score: 1, matchedTerms: [] };

  const qTokens = Array.from(
    new Set(qNorm.split(" ").filter((t) => t.length >= 2))
  );
  if (qTokens.length === 0) return { score: 1, matchedTerms: [] };

  const targetNorm = normalizeMemoryText(target);
  const matchedTerms: string[] = [];

  for (const qt of qTokens) {
    if (targetNorm.includes(qt)) {
      matchedTerms.push(qt);
    }
  }

  const ratio = matchedTerms.length / qTokens.length;
  const exactSubstringBoost = targetNorm.includes(qNorm) ? 0.25 : 0;
  return {
    score: Math.min(1, ratio + exactSubstringBoost),
    matchedTerms,
  };
}

/**
 * Hybrid pgvector + lexical + importance + recency relevance scorer for
 * user-scoped memories and indexed documents.
 */
export function retrieveAndScoreKnowledge(params: {
  query: string;
  memories: MemoryRecordRow[];
  documents?: DocumentRow[];
  categoryFilter?: string;
  includeArchived?: boolean;
  minRelevanceScore?: number;
  limit?: number;
}): {
  memories: ScoredMemoryRecord[];
  documents: ScoredDocumentItem[];
} {
  const {
    query,
    memories,
    documents = [],
    categoryFilter,
    includeArchived = false,
    minRelevanceScore = 0,
    limit = 25,
  } = params;

  const cleanQuery = query.trim();
  const hasQuery = cleanQuery.length > 0;
  const queryEmbedding = hasQuery ? generateEmbedding768(cleanQuery) : null;

  const filteredMemories = memories.filter((m) => {
    if (!includeArchived && m.review_status === "archived") return false;
    if (
      categoryFilter &&
      categoryFilter !== "all" &&
      m.category !== categoryFilter
    ) {
      return false;
    }
    return true;
  });

  const scoredMemories: ScoredMemoryRecord[] = filteredMemories.map((record) => {
    const emb =
      record.embedding && record.embedding.length === 768
        ? record.embedding
        : generateEmbedding768(record.content);

    const importance =
      typeof record.importance_score === "number"
        ? record.importance_score
        : 0.8;
    const reviewBoost = record.review_status === "verified" ? 1.0 : 0.75;

    if (!hasQuery || !queryEmbedding) {
      const baseScore = Number(
        (importance * 0.75 + reviewBoost * 0.25).toFixed(3)
      );
      return {
        record,
        similarityScore: 1,
        lexicalScore: 1,
        importanceScore: importance,
        relevanceScore: baseScore,
        matchReason: `Category: ${record.category}`,
      };
    }

    const sim = cosineSimilarity(queryEmbedding, emb);
    const lex = computeLexicalScore(
      cleanQuery,
      `${record.category} ${record.content}`
    );

    const combined =
      sim * 0.52 +
      lex.score * 0.30 +
      importance * 0.12 +
      reviewBoost * 0.06;

    const relevanceScore = Number(Math.min(1, combined).toFixed(3));
    const reasons: string[] = [];
    if (lex.matchedTerms.length > 0) {
      reasons.push(`Matched terms: ${lex.matchedTerms.slice(0, 4).join(", ")}`);
    }
    reasons.push(`Vector cosine: ${Math.round(sim * 100)}%`);

    return {
      record,
      similarityScore: Number(sim.toFixed(3)),
      lexicalScore: Number(lex.score.toFixed(3)),
      importanceScore: importance,
      relevanceScore,
      matchReason: reasons.join(" • "),
    };
  });

  const rankedMemories = scoredMemories
    .filter((item) =>
      hasQuery
        ? item.relevanceScore >= Math.max(0.18, minRelevanceScore)
        : true
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // Also score and rank user documents for unified Document Retrieval
  const scoredDocs: ScoredDocumentItem[] = documents
    .map((doc) => {
      const docText = `${doc.name} ${doc.summary || ""}`;
      if (!hasQuery || !queryEmbedding) {
        return {
          document: doc,
          similarityScore: 1,
          lexicalScore: 1,
          relevanceScore: 0.85,
          matchedTerms: [],
        };
      }
      const docEmb = generateEmbedding768(docText);
      const sim = cosineSimilarity(queryEmbedding, docEmb);
      const lex = computeLexicalScore(cleanQuery, docText);
      const relevanceScore = Number(
        Math.min(1, sim * 0.55 + lex.score * 0.45).toFixed(3)
      );
      return {
        document: doc,
        similarityScore: Number(sim.toFixed(3)),
        lexicalScore: Number(lex.score.toFixed(3)),
        relevanceScore,
        matchedTerms: lex.matchedTerms,
      };
    })
    .filter((d) =>
      hasQuery ? d.relevanceScore >= Math.max(0.18, minRelevanceScore) : true
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    memories: rankedMemories,
    documents: scoredDocs,
  };
}

