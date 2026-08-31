// ai-provenance-chain — logica pura do grafo de procedencia, sem I/O
// Gerado por: opencode/mimo-v2.5-free em 2026-08-31. Sem dependencias externas.

const EDGE_TYPES = new Set(['documento', 'contexto', 'decisao', 'ferramenta', 'resultado']);

function parseJsonl(text) {
  if (!text || !text.trim()) return [];
  return text.trim().split('\n').map((line, i) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Linha ${i + 1}: JSON invalido`);
    }
  });
}

function detectCycle(edges) {
  const byId = new Map();
  for (const e of edges) byId.set(String(e.id), e);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const e of edges) color.set(String(e.id), WHITE);

  const stack = [];
  for (const e of edges) {
    const eid = String(e.id);
    if (color.get(eid) !== WHITE) continue;
    stack.push(eid);
    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      if (color.get(cur) === WHITE) {
        color.set(cur, GRAY);
        const node = byId.get(cur);
        if (node && node.parentId && byId.has(String(node.parentId))) {
          const pid = String(node.parentId);
          if (color.get(pid) === GRAY) {
            return { cycle: true, at: pid };
          }
          if (color.get(pid) === WHITE) {
            stack.push(pid);
            continue;
          }
        }
      }
      color.set(cur, BLACK);
      stack.pop();
    }
  }
  return { cycle: false };
}

function buildGraph(edges) {
  const byId = new Map();
  const children = new Map();
  for (const e of edges) {
    const eid = String(e.id);
    byId.set(eid, e);
    if (!children.has(eid)) children.set(eid, []);
  }
  for (const e of edges) {
    const eid = String(e.id);
    if (e.parentId) {
      const pid = String(e.parentId);
      if (byId.has(pid)) {
        children.get(pid).push(eid);
      }
    }
  }
  return { byId, children };
}

function walkChain(edges, startId) {
  const { byId } = buildGraph(edges);
  const path = [];
  const visited = new Set();
  let cur = String(startId);
  while (cur) {
    if (visited.has(cur)) return { error: `Ciclo detectado a partir de ${cur}`, path };
    visited.add(cur);
    const node = byId.get(cur);
    if (!node) break;
    path.push(node);
    cur = node.parentId ? String(node.parentId) : null;
  }
  return { path };
}

function buildTree(edges, rootId) {
  const { path, error } = walkChain(edges, rootId);
  if (error) return [error];
  if (path.length === 0) return [`Resultado '${rootId}' nao encontrado`];
  const lines = [];
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const prefix = i === 0 ? '' : '  '.repeat(i - 1) + '└── ';
    const connector = i === 0 ? '' : '';
    const label = i === 0
      ? `[${node.type}] ${node.id} — ${node.summary}`
      : `${prefix}[${node.type}] ${node.id} — ${node.summary}`;
    lines.push(label);
  }
  return lines;
}

function findOrphans(edges) {
  const { byId } = buildGraph(edges);
  function reachesDocumento(id, visited = new Set()) {
    const sid = String(id);
    if (visited.has(sid)) return false;
    visited.add(sid);
    const node = byId.get(sid);
    if (!node) return false;
    if (node.type === 'documento') return true;
    if (node.parentId && byId.has(String(node.parentId))) {
      return reachesDocumento(node.parentId, visited);
    }
    return false;
  }
  const orphans = [];
  for (const e of edges) {
    if (e.type === 'resultado') {
      const hasChain = e.parentId && byId.has(String(e.parentId));
      if (!hasChain || !reachesDocumento(e.id)) {
        orphans.push(e);
      }
    }
  }
  return orphans;
}

function computeStats(edges) {
  const counts = {};
  let totalDepth = 0;
  for (const e of edges) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    let depth = 0;
    let cur = e;
    const visited = new Set();
    while (cur.parentId) {
      if (visited.has(String(cur.id))) break;
      visited.add(String(cur.id));
      depth++;
      const parent = edges.find(x => String(x.id) === String(cur.parentId));
      if (!parent) break;
      cur = parent;
    }
    totalDepth += depth;
  }
  const avgDepth = edges.length > 0 ? totalDepth / edges.length : 0;
  return {
    total: edges.length,
    byType: counts,
    avgDepth: Math.round(avgDepth * 100) / 100,
  };
}

function importReceipts(receiptText, filename) {
  const receipts = parseJsonl(receiptText);
  if (receipts.length === 0) return [];
  const prefix = filename ? filename.replace(/\.[^.]+$/, '') : 'receipts';
  const edges = [];
  const idMap = new Map();
  let prevId = null;
  for (const r of receipts) {
    const rawId = String(r.id);
    const id = `${prefix}:${rawId}`;
    idMap.set(rawId, id);
    const edge = {
      id,
      type: 'ferramenta',
      parentId: prevId,
      timestamp: r.timestamp || null,
      summary: r.tool ? `Ferramenta: ${r.tool}` : 'Sem resumo',
    };
    edges.push(edge);
    prevId = id;
  }
  return edges;
}

export {
  EDGE_TYPES,
  parseJsonl,
  detectCycle,
  buildGraph,
  walkChain,
  buildTree,
  findOrphans,
  computeStats,
  importReceipts,
};
