#!/usr/bin/env node
// agent-receipt — CLI para recibo encadeado de acoes de agentes
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256, buildReceipt, verifyChain, summarize } from './lib.mjs';

function showHelp() {
  console.log(`
agent-receipt — recibo encadeado para acoes de agentes de IA

Uso:
  node cli.mjs append <arquivo.jsonl> --agent <nome> --tool <ferramenta> --input <dados> --policy <politica> [--status ok|erro] [--cost <numero>]
  node cli.mjs verify <arquivo.jsonl>
  node cli.mjs show <arquivo.jsonl>
  node cli.mjs --help

Comandos:
  append   Adiciona um recibo ao final do arquivo JSONL
  verify   Verifica integridade da corrente de recibos
  show     Exibe resumo legivel dos recibos

Exemplos:
  node cli.mjs append receipts.jsonl --agent "Claude" --tool "file_edit" --input "mudei linha 42" --policy "pode escrever"
  node cli.mjs verify receipts.jsonl
  node cli.mjs show receipts.jsonl
`.trim());
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    }
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        parsed[key] = val;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split('\n').map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Linha ${idx + 1}: JSON invalido`);
    }
  });
}

function writeJsonl(filePath, receipts) {
  const lines = receipts.map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(filePath, lines, 'utf8');
}

function cmdAppend(args) {
  const { _: positional, ...flags } = (() => {
    const result = {};
    const raw = args.slice();
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].startsWith('--')) {
        const key = raw[i].slice(2);
        if (key === 'help' || key === 'h') {
          showHelp();
          process.exit(0);
        }
        const val = raw[i + 1];
        if (val && !val.startsWith('--')) {
          result[key] = val;
          i++;
        } else {
          result[key] = true;
        }
      } else {
        if (!result._) result._ = [];
        result._.push(raw[i]);
      }
    }
    return result;
  })();

  const filePath = positional?.[0];
  if (!filePath) {
    console.error('Erro: caminho do arquivo JSONL obrigatorio');
    process.exit(1);
  }

  const required = ['agent', 'tool', 'input', 'policy'];
  for (const key of required) {
    if (!flags[key]) {
      console.error(`Erro: --${key} obrigatorio`);
      process.exit(1);
    }
  }

  const receipts = readJsonl(filePath);
  const id = receipts.length > 0 ? Math.max(...receipts.map(r => r.id)) + 1 : 0;
  const prevHash = receipts.length > 0 ? receipts[receipts.length - 1].receiptHash : null;

  const receipt = buildReceipt({
    id,
    timestamp: new Date().toISOString(),
    agent: flags.agent,
    tool: flags.tool,
    inputHash: sha256(flags.input),
    policy: flags.policy,
    status: flags.status || 'ok',
    cost: flags.cost ? parseFloat(flags.cost) : 0,
    prevHash,
  });

  appendFileSync(filePath, JSON.stringify(receipt) + '\n', 'utf8');
  console.log(`Recibo #${id} adicionado com sucesso`);
}

function cmdVerify(args) {
  const filePath = args[0];
  if (!filePath) {
    console.error('Erro: caminho do arquivo JSONL obrigatorio');
    process.exit(1);
  }

  const receipts = readJsonl(filePath);
  if (receipts.length === 0) {
    console.log('Arquivo vazio. Nenhum recibo para verificar.');
    return;
  }

  const result = verifyChain(receipts);

  if (result.ok) {
    console.log(`Corrente integra. ${receipts.length} recibos verificados com sucesso.`);
  } else {
    console.log(`CORRENTE COMPROMETIDA — ${result.errors.length} erro(s) encontrado(s):`);
    for (const err of result.errors) {
      console.log(`  Linha ${err.line}: ${err.reason}`);
    }
    process.exit(1);
  }
}

function cmdShow(args) {
  const filePath = args[0];
  if (!filePath) {
    console.error('Erro: caminho do arquivo JSONL obrigatorio');
    process.exit(1);
  }

  const receipts = readJsonl(filePath);
  if (receipts.length === 0) {
    console.log('Arquivo vazio.');
    return;
  }

  const summary = summarize(receipts);

  console.log(`Resumo dos recibos (${filePath})`);
  console.log(`  Total de acoes: ${summary.totalActions}`);
  console.log(`  Custo total: ${summary.totalCost.toFixed(6)}`);
  console.log('  Por ferramenta:');
  for (const [tool, count] of Object.entries(summary.byTool)) {
    console.log(`    ${tool}: ${count}`);
  }
}

const command = process.argv[2];
const rest = process.argv.slice(3);

switch (command) {
  case 'append':
    cmdAppend(rest);
    break;
  case 'verify':
    cmdVerify(rest);
    break;
  case 'show':
    cmdShow(rest);
    break;
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Comando desconhecido: ${command}`);
    showHelp();
    process.exit(1);
}
