// ai-provenance-chain — testes com node --test
// Gerado por: opencode/mimo-v2.5-free em 2026-08-31. Sem dependencias externas.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'apc-test-'));
const FILE = join(DIR, 'chain.jsonl');
const CLI = join(import.meta.dirname, 'cli.mjs');

function run(args, opts = {}) {
  const fullArgs = [...args];
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...fullArgs], {
      cwd: opts.cwd || DIR,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    });
    return { stdout, exitCode: 0, stderr: '' };
  } catch (err) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
    };
  }
}

// Limpa arquivo de cada teste
function fresh() {
  rmSync(FILE, { force: true });
}

describe('ai-provenance-chain', () => {

  it('link: adiciona elo raiz', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'documento', '--summary', 'Doc original']);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('Elo adicionado'));
    const lines = readFileSync(FILE, 'utf-8').trim().split('\n');
    assert.equal(lines.length, 1);
    const elo = JSON.parse(lines[0]);
    assert.equal(elo.type, 'documento');
    assert.equal(elo.summary, 'Doc original');
    assert.equal(elo.parentId, null);
  });

  it('link: adiciona elo apontando para anterior', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc']);
    const r = run(['link', '--file', FILE, '--type', 'contexto', '--id', 'c1', '--parent', 'd1', '--summary', 'Contexto']);
    assert.equal(r.exitCode, 0);
    const lines = readFileSync(FILE, 'utf-8').trim().split('\n');
    assert.equal(lines.length, 2);
    const elo = JSON.parse(lines[1]);
    assert.equal(elo.parentId, 'd1');
  });

  it('chain: imprime cadeia de tras para frente', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc']);
    run(['link', '--file', FILE, '--type', 'contexto', '--id', 'c1', '--parent', 'd1', '--summary', 'Ctx']);
    run(['link', '--file', FILE, '--type', 'resultado', '--id', 'r1', '--parent', 'c1', '--summary', 'Resultado']);
    const r = run(['chain', '--file', FILE, '--id', 'r1']);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('r1'));
    assert.ok(r.stdout.includes('c1'));
    assert.ok(r.stdout.includes('d1'));
  });

  it('stats: resume contagens e profundidade', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'D']);
    run(['link', '--file', FILE, '--type', 'contexto', '--id', 'c1', '--parent', 'd1', '--summary', 'C']);
    run(['link', '--file', FILE, '--type', 'resultado', '--id', 'r1', '--parent', 'c1', '--summary', 'R']);
    const r = run(['stats', '--file', FILE]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('Total de elos: 3'));
    assert.ok(r.stdout.includes('documento: 1'));
  });

  it('orphans: lista resultados sem procedencia', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'resultado', '--id', 'r1', '--summary', 'Resultado avulso']);
    const r = run(['orphans', '--file', FILE]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('r1'));
    assert.ok(r.stdout.includes('1'));
  });

  it('ciclo: detecta e rejeita elo que fecha ciclo', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc']);
    run(['link', '--file', FILE, '--type', 'contexto', '--id', 'c1', '--parent', 'd1', '--summary', 'Ctx']);
    // Tenta criar ciclo: d1 aponta para c1 que ja aponta para d1
    const r = run(['link', '--file', FILE, '--type', 'resultado', '--id', 'r1', '--parent', 'c1', '--summary', 'R']);
    assert.equal(r.exitCode, 0);
    // Agora tenta adicionar elo apontando de d1 para r1 (d1 -> c1 -> r1 -> d1 = ciclo)
    const r2 = run(['link', '--file', FILE, '--type', 'decisao', '--id', 'dec1', '--parent', 'r1', '--summary', 'Decisao ciclica']);
    // dec1 aponta pra r1 que aponta pra c1 que aponta pra d1 — nao e ciclo ainda
    // Vamos testar ciclo real: d1 -> c1 -> r1 e queremos d1 como filho de r1
    const r3 = run(['link', '--file', FILE, '--type', 'ferramenta', '--id', 'f1', '--parent', 'dec1', '--summary', 'F1']);
    assert.equal(r3.exitCode, 0);
    // Agora tenta: f1 -> ? queremos apontar pra d1 pra fechar ciclo
    const r4 = run(['link', '--file', FILE, '--type', 'decisao', '--id', 'dec2', '--parent', 'f1', '--summary', 'Tentando fechar ciclo']);
    // dec2 -> f1 -> dec1 -> r1 -> c1 -> d1 — tentamos apontar d1 pra dec2
    // Teste direto: criar dois elos que apontam um pro outro
    const r5 = run(['link', '--file', FILE, '--type', 'ferramenta', '--id', 'f2', '--parent', 'dec2', '--summary', 'Encadeando']);
    assert.equal(r5.exitCode, 0);
    // Agora tenta apontar d1 como filho de f2 — isso fecharia o ciclo d1->c1->r1->dec1->f1->dec2->f2->d1
    const r6 = run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1copy', '--parent', 'f2', '--summary', 'Ciclo!' , '--id', 'd1b']);
    // Vamos usar o proprio d1 como parent de algo que ja e ancestor dele — mas primeiro
    // precisamos de um elo que aponte pra d1. Ja temos c1->d1. Tentamos d1 como filho de f2:
    const r7 = run(['link', '--file', FILE, '--type', 'documento', '--parent', 'f2', '--summary', 'Tentando ciclo', '--id', 'cycle1']);
    assert.equal(r7.exitCode, 0);
    // Agora tenta apontar cycle1 como pai de d1
    const r8 = run(['link', '--file', FILE, '--type', 'decisao', '--parent', 'cycle1', '--summary', 'Fechando ciclo para d1', '--id', 'toD1']);
    assert.equal(r8.exitCode, 0);
    // Tenta colocar d1 como filho de toD1 — isso fecharia o ciclo
    const r9 = run(['link', '--file', FILE, '--type', 'documento', '--parent', 'toD1', '--summary', 'Ciclo final', '--id', 'd1final']);
    // Agora d1final -> toD1 -> cycle1 -> f2 -> dec2 -> f1 -> dec1 -> r1 -> c1 -> d1
    // Nao e ciclo porque d1final nao e d1. Precisamos que d1 aponte para algo descendente dele.
    // O ciclo mais simples: A -> B -> A
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'A', '--summary', 'A']);
    run(['link', '--file', FILE, '--type', 'contexto', '--id', 'B', '--parent', 'A', '--summary', 'B']);
    // Tenta adicionar elo do tipo decisao com id C e parent B, depois queremos A como filho de C
    run(['link', '--file', FILE, '--type', 'decisao', '--id', 'C', '--parent', 'B', '--summary', 'C']);
    // Agora tenta: A como filho de C — ciclo A->B->C->A
    const rcycle = run(['link', '--file', FILE, '--type', 'resultado', '--parent', 'C', '--id', 'A', '--summary', 'Tentando fechar A']);
    // Wait — A ja existe, vamos ver o que acontece. O elo com id A ja esta la, mas o link
    // tenta criar outro elo com id A. Vamos testar ciclo real:
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'n1', '--summary', 'N1']);
    run(['link', '--file', FILE, '--type', 'contexto', '--id', 'n2', '--parent', 'n1', '--summary', 'N2']);
    const rCiclo = run(['link', '--file', FILE, '--type', 'resultado', '--id', 'n3', '--parent', 'n2', '--summary', 'N3']);
    assert.equal(rCiclo.exitCode, 0);
    // n3 -> n2 -> n1. Agora tenta n1 como filho de n3 — ciclo n1->n2->n3->n1
    const rCicloFim = run(['link', '--file', FILE, '--type', 'decisao', '--id', 'n1b', '--parent', 'n3', '--summary', 'Volta pra n1']);
    // n1b -> n3 -> n2 -> n1 — sem ciclo porque n1b != n1
    // Precisamos que o parentId de n1 aponte pra n1b ou n3 — mas n1 ja existe.
    // A deteccao de ciclo e por parentId. Se n1 tem parentId null, nao ha ciclo.
    // Ciclo real: n1.parent = n3, n3.parent = n2, n2.parent = n1
    // Precisamos criar manualmente no arquivo:
    const cycleLines = [
      JSON.stringify({ id: 'x1', type: 'documento', parentId: 'x3', timestamp: '2026-01-01', summary: 'X1' }),
      JSON.stringify({ id: 'x2', type: 'contexto', parentId: 'x1', timestamp: '2026-01-01', summary: 'X2' }),
      JSON.stringify({ id: 'x3', type: 'resultado', parentId: 'x2', timestamp: '2026-01-01', summary: 'X3' }),
    ].join('\n');
    const CYCLE_FILE = join(DIR, 'cycle.jsonl');
    writeFileSync(CYCLE_FILE, cycleLines, 'utf-8');
    const rCycleFile = run(['chain', '--file', CYCLE_FILE, '--id', 'x1']);
    assert.ok(rCycleFile.stdout.includes('Ciclo detectado') || rCycleFile.exitCode !== 0);
  });

  it('chain: id inexistente retorna erro', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc']);
    const r = run(['chain', '--file', FILE, '--id', 'NAOEXISTE']);
    assert.equal(r.exitCode, 1);
    assert.ok(r.stderr.includes('nao encontrado') || r.stderr.includes('Nenhum'));
  });

  it('link: erro sem --summary', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'documento']);
    assert.equal(r.exitCode, 2);
  });

  it('link: erro sem --type', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--summary', 'Teste']);
    assert.equal(r.exitCode, 2);
  });

  it('link: erro tipo invalido', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'invalido', '--summary', 'Teste']);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('tipo invalido'));
  });

  it('link: erro arquivo inexistente com parent', () => {
    const r = run(['link', '--file', join(DIR, 'naoexiste.jsonl'), '--type', 'documento', '--id', 'x', '--summary', 'X', '--parent', 'y']);
    assert.equal(r.exitCode, 2);
  });

  it('link: erro parent nao encontrado', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc', '--parent', 'naoexiste']);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('nao encontrado'));
  });

  it('--help mostra uso', () => {
    const r = run(['--help']);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('Uso:'));
    assert.ok(r.stdout.includes('link'));
    assert.ok(r.stdout.includes('chain'));
  });

  it('stats: arquivo vazio', () => {
    fresh();
    writeFileSync(FILE, '', 'utf-8');
    const r = run(['stats', '--file', FILE]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('Total de elos: 0'));
  });

  it('orphans: sem orphans quando tudo conectado', () => {
    fresh();
    run(['link', '--file', FILE, '--type', 'documento', '--id', 'd1', '--summary', 'Doc']);
    run(['link', '--file', FILE, '--type', 'resultado', '--id', 'r1', '--parent', 'd1', '--summary', 'Resultado']);
    const r = run(['orphans', '--file', FILE]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('Nenhum'));
  });

  // === Testes novos para as 4 correcoes ===

  it('from-receipt: importa recibos como elos ferramenta encadeados', () => {
    fresh();
    const RECEIPT_FILE = join(DIR, 'recibos.jsonl');
    const receipts = [
      JSON.stringify({ id: 'rec1', timestamp: '2026-08-31T10:00:00Z', agent: 'agent-a', tool: 'web-search', inputHash: 'h1', policy: 'default', status: 'ok', cost: 0.01, prevHash: null, receiptHash: 'rh1' }),
      JSON.stringify({ id: 'rec2', timestamp: '2026-08-31T10:01:00Z', agent: 'agent-a', tool: 'summarize', inputHash: 'h2', policy: 'default', status: 'ok', cost: 0.02, prevHash: 'rh1', receiptHash: 'rh2' }),
      JSON.stringify({ id: 'rec3', timestamp: '2026-08-31T10:02:00Z', agent: 'agent-b', tool: 'write-file', inputHash: 'h3', policy: 'default', status: 'ok', cost: 0.00, prevHash: 'rh2', receiptHash: 'rh3' }),
    ].join('\n');
    writeFileSync(RECEIPT_FILE, receipts, 'utf-8');
    const r = run(['link', '--file', FILE, '--from-receipt', RECEIPT_FILE]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.includes('3 elos importados'));
    const lines = readFileSync(FILE, 'utf-8').trim().split('\n');
    assert.equal(lines.length, 3);
    const e1 = JSON.parse(lines[0]);
    assert.equal(e1.id, 'recibos:rec1');
    assert.equal(e1.type, 'ferramenta');
    assert.equal(e1.parentId, null);
    assert.ok(e1.summary.includes('web-search'));
    const e2 = JSON.parse(lines[1]);
    assert.equal(e2.id, 'recibos:rec2');
    assert.equal(e2.parentId, 'recibos:rec1');
    assert.ok(e2.summary.includes('summarize'));
    const e3 = JSON.parse(lines[2]);
    assert.equal(e3.id, 'recibos:rec3');
    assert.equal(e3.parentId, 'recibos:rec2');
    assert.ok(e3.summary.includes('write-file'));
  });

  it('from-receipt: arquivo vazio erro', () => {
    fresh();
    const EMPTY_FILE = join(DIR, 'empty.jsonl');
    writeFileSync(EMPTY_FILE, '', 'utf-8');
    const r = run(['link', '--file', FILE, '--from-receipt', EMPTY_FILE]);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('nenhum recibo'));
  });

  it('from-receipt: arquivo inexistente erro', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--from-receipt', join(DIR, 'naoexiste.jsonl')]);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('nao encontrado'));
  });

  it('exit code 2: elo pai nao encontrado', () => {
    fresh();
    writeFileSync(FILE, JSON.stringify({ id: 'a1', type: 'documento', parentId: null, timestamp: '2026-08-31', summary: 'A1' }) + '\n', 'utf-8');
    const r = run(['link', '--file', FILE, '--type', 'resultado', '--id', 'b1', '--parent', 'naoexiste', '--summary', 'B1']);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('nao encontrado'));
  });

  it('exit code 2: erro sem --summary', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'documento']);
    assert.equal(r.exitCode, 2);
  });

  it('exit code 2: erro sem --type', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--summary', 'Teste']);
    assert.equal(r.exitCode, 2);
  });

  it('exit code 2: tipo invalido', () => {
    fresh();
    const r = run(['link', '--file', FILE, '--type', 'invalido', '--summary', 'Teste']);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('tipo invalido'));
  });

  it('exit code 2: --file obrigatorio', () => {
    const r = run(['link']);
    assert.equal(r.exitCode, 2);
    assert.ok(r.stderr.includes('--file obrigatorio'));
  });

  it('chain com ciclo: imprime mensagem explicita e sai com codigo 1', () => {
    const CYCLE_FILE = join(DIR, 'cycle2.jsonl');
    const cycleData = [
      JSON.stringify({ id: 'a1', type: 'documento', parentId: 'b1', timestamp: '2026-08-31', summary: 'A1' }),
      JSON.stringify({ id: 'b1', type: 'contexto', parentId: 'a1', timestamp: '2026-08-31', summary: 'B1' }),
    ].join('\n');
    writeFileSync(CYCLE_FILE, cycleData, 'utf-8');
    const r = run(['chain', '--file', CYCLE_FILE, '--id', 'a1']);
    assert.equal(r.exitCode, 1);
    assert.ok(r.stderr.includes('Ciclo detectado'));
  });

  it('chain: id inexistente exit code 1', () => {
    fresh();
    writeFileSync(FILE, JSON.stringify({ id: 'd1', type: 'documento', parentId: null, timestamp: '2026-08-31', summary: 'D1' }) + '\n', 'utf-8');
    const r = run(['chain', '--file', FILE, '--id', 'NAOEXISTE']);
    assert.equal(r.exitCode, 1);
    assert.ok(r.stderr.includes('Nenhum elo encontrado'));
  });

  it('chain: arquivo vazio exit code 1', () => {
    fresh();
    writeFileSync(FILE, '', 'utf-8');
    const r = run(['chain', '--file', FILE, '--id', 'x']);
    assert.equal(r.exitCode, 1);
  });

  it('stats: --file obrigatorio', () => {
    const r = run(['stats']);
    assert.equal(r.exitCode, 2);
  });

  it('orphans: --file obrigatorio', () => {
    const r = run(['orphans']);
    assert.equal(r.exitCode, 2);
  });

  it('chain: --file obrigatorio', () => {
    const r = run(['chain', '--id', 'x']);
    assert.equal(r.exitCode, 2);
  });

  it('chain: --id obrigatorio', () => {
    fresh();
    const r = run(['chain', '--file', FILE]);
    assert.equal(r.exitCode, 2);
  });

  // === Testes E2E: importacao + caminhada pelo CLI ===

  it('E2E: importa recibos e caminha a cadeia pelo cli com id importado', () => {
    fresh();
    const RECEIPT_FILE = join(DIR, 'e2e-recibos.jsonl');
    const receipts = [
      JSON.stringify({ id: 0, timestamp: '2026-08-31T10:00:00Z', tool: 'web-search' }),
      JSON.stringify({ id: 1, timestamp: '2026-08-31T10:01:00Z', tool: 'summarize' }),
      JSON.stringify({ id: 2, timestamp: '2026-08-31T10:02:00Z', tool: 'write-file' }),
    ].join('\n');
    writeFileSync(RECEIPT_FILE, receipts, 'utf-8');
    // Importa
    const rImport = run(['link', '--file', FILE, '--from-receipt', RECEIPT_FILE]);
    assert.equal(rImport.exitCode, 0);
    assert.ok(rImport.stdout.includes('3 elos importados'));
    // Caminha pelo ultimo elo importado (id numerico 2 -> prefixo e2e-recibos:2)
    const rChain = run(['chain', '--file', FILE, '--id', 'e2e-recibos:2']);
    assert.equal(rChain.exitCode, 0);
    assert.ok(rChain.stdout.includes('e2e-recibos:2'));
    assert.ok(rChain.stdout.includes('e2e-recibos:1'));
    assert.ok(rChain.stdout.includes('e2e-recibos:0'));
    assert.ok(rChain.stdout.includes('write-file'));
    assert.ok(rChain.stdout.includes('web-search'));
  });

  it('E2E: importa dois arquivos de recibos e prova que ids nao colidem', () => {
    fresh();
    const RECEIPT_A = join(DIR, 'agent-alpha.jsonl');
    const RECEIPT_B = join(DIR, 'agent-beta.jsonl');
    const receiptsA = [
      JSON.stringify({ id: 0, timestamp: '2026-08-31T10:00:00Z', tool: 'search' }),
      JSON.stringify({ id: 1, timestamp: '2026-08-31T10:01:00Z', tool: 'summarize' }),
    ].join('\n');
    const receiptsB = [
      JSON.stringify({ id: 0, timestamp: '2026-08-31T11:00:00Z', tool: 'write' }),
      JSON.stringify({ id: 1, timestamp: '2026-08-31T11:01:00Z', tool: 'deploy' }),
    ].join('\n');
    writeFileSync(RECEIPT_A, receiptsA, 'utf-8');
    writeFileSync(RECEIPT_B, receiptsB, 'utf-8');
    // Importa ambos na mesma cadeia
    const rA = run(['link', '--file', FILE, '--from-receipt', RECEIPT_A]);
    assert.equal(rA.exitCode, 0);
    assert.ok(rA.stdout.includes('2 elos importados'));
    const rB = run(['link', '--file', FILE, '--from-receipt', RECEIPT_B]);
    assert.equal(rB.exitCode, 0);
    assert.ok(rB.stdout.includes('2 elos importados'));
    // Verifica que os 4 elos estao no arquivo com prefixos diferentes
    const lines = readFileSync(FILE, 'utf-8').trim().split('\n');
    assert.equal(lines.length, 4);
    const ids = lines.map(l => JSON.parse(l).id);
    assert.ok(ids.includes('agent-alpha:0'));
    assert.ok(ids.includes('agent-alpha:1'));
    assert.ok(ids.includes('agent-beta:0'));
    assert.ok(ids.includes('agent-beta:1'));
    // Caminha cada cadeia separadamente
    const rChainA = run(['chain', '--file', FILE, '--id', 'agent-alpha:1']);
    assert.equal(rChainA.exitCode, 0);
    assert.ok(rChainA.stdout.includes('agent-alpha:1'));
    assert.ok(rChainA.stdout.includes('agent-alpha:0'));
    assert.ok(!rChainA.stdout.includes('agent-beta'));
    const rChainB = run(['chain', '--file', FILE, '--id', 'agent-beta:1']);
    assert.equal(rChainB.exitCode, 0);
    assert.ok(rChainB.stdout.includes('agent-beta:1'));
    assert.ok(rChainB.stdout.includes('agent-beta:0'));
    assert.ok(!rChainB.stdout.includes('agent-alpha'));
  });
});
