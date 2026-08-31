// agent-receipt — funcoes puras para recibo encadeado de acoes de agentes
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { createHash } from 'node:crypto';

export function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

export function buildReceipt({ id, timestamp, agent, tool, inputHash, policy, status, cost, prevHash }) {
  if (id == null || timestamp == null || agent == null || tool == null || inputHash == null || policy == null || status == null) {
    throw new Error('Campos obrigatorios ausentes: id, timestamp, agent, tool, inputHash, policy, status');
  }
  const receipt = {
    id,
    timestamp,
    agent,
    tool,
    inputHash,
    policy,
    status,
    cost: cost ?? 0,
    prevHash: prevHash ?? null,
  };
  receipt.receiptHash = sha256(JSON.stringify(receipt));
  return receipt;
}

export function verifyChain(receipts) {
  if (receipts.length === 0) return { ok: true, errors: [] };

  const errors = [];

  if (receipts[0].prevHash !== null) {
    errors.push({ line: 1, reason: 'Primeiro recibo deve ter prevHash null' });
  }

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const { receiptHash, ...rest } = r;
    const expected = sha256(JSON.stringify(rest));
    if (receiptHash !== expected) {
      errors.push({ line: i + 1, reason: `Hash do recibo diferente: esperado ${expected}, encontrado ${receiptHash}` });
    }
  }

  for (let i = 1; i < receipts.length; i++) {
    const prev = receipts[i - 1];
    const curr = receipts[i];
    if (curr.prevHash !== prev.receiptHash) {
      errors.push({ line: i + 1, reason: `prevHash nao bate com o recibo anterior (linha ${i})` });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function summarize(receipts) {
  const totalActions = receipts.length;
  const totalCost = receipts.reduce((sum, r) => sum + (r.cost || 0), 0);
  const byTool = {};
  for (const r of receipts) {
    byTool[r.tool] = (byTool[r.tool] || 0) + 1;
  }
  return { totalActions, totalCost, byTool };
}
