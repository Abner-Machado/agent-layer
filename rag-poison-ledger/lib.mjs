// rag-poison-ledger — pure functions for the append-only ledger
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

/**
 * Create a new entry line (type=e).
 * @param {string} id - unique response id
 * @param {string[]} docIds - document ids injected into context
 * @param {string} [text] - optional response text
 * @returns {object}
 */
export function createEntry(id, docIds, text) {
  if (!id || typeof id !== "string") throw new Error("id is required");
  if (!Array.isArray(docIds)) throw new Error("docIds must be an array");
  return { t: "e", id, docs: docIds, text: text || "", ts: Date.now() };
}

/**
 * Create a flag line (type=f).
 * @param {string} docId
 * @param {string} status - poisoned | incorrect
 * @param {string} by - who flagged
 * @param {string} why - reason
 * @returns {object}
 */
export function createFlag(docId, status, by, why) {
  if (!docId || typeof docId !== "string") throw new Error("docId is required");
  if (!["poisoned", "incorrect"].includes(status))
    throw new Error("status must be poisoned or incorrect");
  if (!by) throw new Error("by is required");
  return { t: "f", docId, status, by, why: why || "", ts: Date.now() };
}

/**
 * Create a correction line (type=c).
 * @param {string} docId
 * @param {string} status - poisoned | incorrect | clean
 * @param {string} by
 * @param {string} why
 * @returns {object}
 */
export function createCorrection(docId, status, by, why) {
  if (!docId || typeof docId !== "string") throw new Error("docId is required");
  if (!["poisoned", "incorrect", "clean"].includes(status))
    throw new Error("status must be poisoned, incorrect, or clean");
  if (!by) throw new Error("by is required");
  return { t: "c", docId, status, by, why: why || "", ts: Date.now() };
}

/**
 * Derive current status of a document from flags + corrections.
 * @param {string} docId
 * @param {object[]} lines - full ledger lines
 * @returns {{ status: string|null, by: string|null, why: string|null, ts: number|null }}
 */
export function docStatus(docId, lines) {
  let status = null;
  let by = null;
  let why = null;
  let ts = null;

  for (const line of lines) {
    if (line.docId !== docId) continue;

    if (line.t === "f") {
      status = line.status;
      by = line.by;
      why = line.why;
      ts = line.ts;
    } else if (line.t === "c") {
      status = line.status;
      by = line.by;
      why = line.why;
      ts = line.ts;
    }
  }

  return { status, by, why, ts };
}

/**
 * Build inverted index: docId -> [entryId, ...] from entry lines only.
 * @param {object[]} lines
 * @returns {Map<string, string[]>}
 */
export function buildIndex(lines) {
  const index = new Map();
  for (const line of lines) {
    if (line.t !== "e") continue;
    for (const docId of line.docs) {
      if (!index.has(docId)) index.set(docId, []);
      index.get(docId).push(line.id);
    }
  }
  return index;
}

/**
 * blast — find all responses that used a given document.
 * Returns entries sorted newest first, annotated with doc status.
 * @param {string} docId
 * @param {object[]} lines
 * @returns {object[]}
 */
export function blast(docId, lines) {
  const index = buildIndex(lines);
  const entryIds = index.get(docId) || [];
  const entries = lines.filter((l) => l.t === "e" && entryIds.includes(l.id));
  const status = docStatus(docId, lines);

  return entries
    .sort((a, b) => b.ts - a.ts)
    .map((e) => ({
      id: e.id,
      text: e.text,
      docs: e.docs,
      ts: e.ts,
      docStatus: e.docs.includes(docId) ? status : null,
    }));
}

/**
 * trace — find all documents used by a given response.
 * Returns documents with their current status.
 * @param {string} entryId
 * @param {object[]} lines
 * @returns {{ entry: object|null, documents: object[] }}
 */
export function trace(entryId, lines) {
  const entry = lines.find((l) => l.t === "e" && l.id === entryId);
  if (!entry) return { entry: null, documents: [] };

  const documents = entry.docs.map((docId) => {
    const s = docStatus(docId, lines);
    return { docId, status: s.status, by: s.by, why: s.why, ts: s.ts };
  });

  return { entry, documents };
}

/**
 * Parse a JSONL string into an array of objects, skipping blank/invalid lines.
 * @param {string} raw
 * @returns {object[]}
 */
export function parseJsonl(raw) {
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Serialize an object to a JSONL line.
 * @param {object} obj
 * @returns {string}
 */
export function toJsonl(obj) {
  return JSON.stringify(obj);
}
