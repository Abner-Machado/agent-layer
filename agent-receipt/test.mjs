// agent-receipt — testes da corrente de recibos
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { sha256, buildReceipt, verifyChain, summarize } from './lib.mjs';

const TMP = join(import.meta.dirname, 'exemplos', '_test_tmp');

function setup() {
  mkdirSync(TMP, { recursive: true });
}

function cleanup() {
  try { unlinkSync(join(TMP, 'chain.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'tampered.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'valid2.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'single.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'cost.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'empty.jsonl')); } catch {}
  try { unlinkSync(join(TMP, 'missing.jsonl')); } catch {}
}

function buildChain(count) {
  const receipts = [];
  for (let i = 0; i < count; i++) {
    const prevHash = receipts.length > 0 ? receipts[receipts.length - 1].receiptHash : null;
    receipts.push(buildReceipt({
      id: i,
      timestamp: `2026-08-30T12:00:0${i}.000Z`,
      agent: `agent-${i}`,
      tool: `tool-${i % 3}`,
      inputHash: sha256(`input-${i}`),
      policy: `politica-${i}`,
      status: 'ok',
      cost: i * 0.01,
      prevHash,
    }));
  }
  return receipts;
}

function writeChain(filePath, receipts) {
  writeFileSync(filePath, receipts.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

setup();

describe('verifyChain', () => {
  it('corrente valida sem erros', () => {
    const receipts = buildChain(3);
    const result = verifyChain(receipts);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  it('detecta adulteracao de campo no meio da corrente', () => {
    const receipts = buildChain(3);
    receipts[1].agent = 'HACKED';
    const result = verifyChain(receipts);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.line === 2));
    assert.ok(result.errors.some(e => e.reason.includes('Hash do recibo diferente')));
  });

  it('detecta linha removida do meio (prevHash quebrado)', () => {
    const receipts = buildChain(3);
    const removed = [receipts[0], receipts[2]];
    const result = verifyChain(removed);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.line === 2));
    assert.ok(result.errors.some(e => e.reason.includes('prevHash nao bate')));
  });

  it('corrente com 5 recibos validos nao da falso positivo', () => {
    const receipts = buildChain(5);
    const result = verifyChain(receipts);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  it('corrente vazia e valida', () => {
    const result = verifyChain([]);
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  it('primeiro recibo com prevHash nao-nulo gera erro', () => {
    const receipts = buildChain(2);
    receipts[0].prevHash = 'hash-falso';
    const result = verifyChain(receipts);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.line === 1));
    assert.ok(result.errors.some(e => e.reason.includes('Primeiro recibo')));
  });

  it('linha removida do meio gera erros com numeros de linha maiores que zero', () => {
    const receipts = buildChain(3);
    const removed = [receipts[0], receipts[2]];
    const result = verifyChain(removed);
    assert.equal(result.ok, false);
    for (const err of result.errors) {
      assert.ok(err.line > 0, `Linha ${err.line} deveria ser maior que 0`);
    }
  });

  it('cost e somado corretamente', () => {
    const receipts = buildChain(3);
    const summary = summarize(receipts);
    assert.equal(summary.totalActions, 3);
    assert.ok(Math.abs(summary.totalCost - 0.03) < 1e-10);
  });

  it('summarize conta ferramentas por nome', () => {
    const receipts = buildChain(6);
    const summary = summarize(receipts);
    assert.equal(summary.byTool['tool-0'], 2);
    assert.equal(summary.byTool['tool-1'], 2);
    assert.equal(summary.byTool['tool-2'], 2);
  });
});

cleanup();
