#!/usr/bin/env node
// ai-provenance-chain — CLI para cadeia de procedencia em JSONL append-only
// Gerado por: opencode/mimo-v2.5-free em 2026-08-31. Sem dependencias externas.

import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  EDGE_TYPES,
  parseJsonl,
  detectCycle,
  walkChain,
  buildTree,
  findOrphans,
  computeStats,
  importReceipts,
} from './lib.mjs';

function usage() {
  const msg = `Uso: node cli.mjs <comando> [opcoes]

Comandos:
  link       Adiciona um elo a cadeia apontando para o elo anterior
  chain      Imprime a cadeia inteira de tras para frente a partir de um resultado
  orphans    Lista resultados sem procedencia (sem caminho ate origem)
  stats      Resume quantos elos de cada tipo e profundidade media

Opcoes de link:
  --type <tipo>       Tipo do elo: documento, contexto, decisao, ferramenta, resultado
  --id <id>           ID customizado (auto-gerado se omitido)
  --parent <id>       ID do elo anterior (elo-raiz se omitido)
  --summary <texto>   Resumo curto do elo (obrigatorio)
  --file <arquivo>    Arquivo JSONL para adicionar o elo
  --from-receipt <f>  Importa recibos de um JSONL como elos tipo ferramenta

Opcoes de chain:
  --id <id>           ID do resultado para rastrear
  --file <arquivo>    Arquivo JSONL da cadeia

Opcoes de orphans:
  --file <arquivo>    Arquivo JSONL da cadeia

Opcoes de stats:
  --file <arquivo>    Arquivo JSONL da cadeia`;
  return msg;
}

function exit(msg, code = 2) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from-receipt') {
      opts.fromReceipt = argv[++i];
    } else if (argv[i] === '--file') {
      opts.file = argv[++i];
    } else if (argv[i] === '--type') {
      opts.type = argv[++i];
    } else if (argv[i] === '--id') {
      opts.id = argv[++i];
    } else if (argv[i] === '--parent') {
      opts.parent = argv[++i];
    } else if (argv[i] === '--summary') {
      opts.summary = argv[++i];
    }
  }
  return opts;
}

function cmdLink(opts) {
  if (!opts.file) exit('Erro: --file obrigatorio para link');

  const filePath = resolve(opts.file);
  const lines = [];
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    lines.push(...parseJsonl(raw));
  }

  if (opts.fromReceipt) {
    const receiptPath = resolve(opts.fromReceipt);
    if (!existsSync(receiptPath)) exit(`Erro: arquivo de recibos nao encontrado: ${receiptPath}`);
    const receiptRaw = readFileSync(receiptPath, 'utf-8');
    const receiptBasename = receiptPath.split(/[/\\]/).pop();
    const newEdges = importReceipts(receiptRaw, receiptBasename);
    if (newEdges.length === 0) {
      exit('Erro: nenhum recibo encontrado no arquivo');
    }

    const candidate = [...lines, ...newEdges];
    const cycle = detectCycle(candidate);
    if (cycle.cycle) {
      exit(`Erro: ciclo detectado apontando de ${cycle.at}. Elcos nao adicionados.`);
    }

    for (const e of newEdges) {
      appendFileSync(filePath, JSON.stringify(e) + '\n', 'utf-8');
    }
    console.log(`${newEdges.length} elos importados de recibos -> ${opts.file}`);
    return;
  }

  if (!opts.summary) exit('Erro: --summary obrigatorio para link');
  if (!opts.type) exit('Erro: --type obrigatorio para link');
  if (!EDGE_TYPES.has(opts.type)) {
    exit(`Erro: tipo invalido '${opts.type}'. Tipos validos: ${[...EDGE_TYPES].join(', ')}`);
  }

  const id = opts.id || randomUUID().slice(0, 8);
  const parentId = opts.parent || null;

  if (parentId) {
    const parentIdStr = String(parentId);
    const exists = lines.some(e => String(e.id) === parentIdStr);
    if (!exists) exit(`Erro: elo pai '${parentId}' nao encontrado no arquivo`);
  }

  const elo = {
    id,
    type: opts.type,
    parentId,
    timestamp: new Date().toISOString(),
    summary: opts.summary,
  };

  const candidate = [...lines, elo];
  const cycle = detectCycle(candidate);
  if (cycle.cycle) {
    exit(`Erro: ciclo detectado apontando de ${id} para ${cycle.at}. Elo nao adicionado.`);
  }

  appendFileSync(filePath, JSON.stringify(elo) + '\n', 'utf-8');
  console.log(`Elo adicionado: ${id} (${opts.type}) -> ${parentId || 'raiz'}`);
}

function cmdChain(opts) {
  if (!opts.file) exit('Erro: --file obrigatorio para chain');
  if (!opts.id) exit('Erro: --id obrigatorio para chain');
  const filePath = resolve(opts.file);
  if (!existsSync(filePath)) exit(`Erro: arquivo nao encontrado: ${filePath}`);
  const raw = readFileSync(filePath, 'utf-8');
  const edges = parseJsonl(raw);
  if (edges.length === 0) {
    exit(`Nenhum elo encontrado com id '${opts.id}'`, 1);
  }
  const { path, error } = walkChain(edges, opts.id);
  if (error) {
    exit(error, 1);
  }
  if (path.length === 0) {
    exit(`Nenhum elo encontrado com id '${opts.id}'`, 1);
  }
  const lines = buildTree(edges, opts.id);
  for (const l of lines) console.log(l);
}

function cmdOrphans(opts) {
  if (!opts.file) exit('Erro: --file obrigatorio para orphans');
  const filePath = resolve(opts.file);
  if (!existsSync(filePath)) exit(`Erro: arquivo nao encontrado: ${filePath}`);
  const raw = readFileSync(filePath, 'utf-8');
  const edges = parseJsonl(raw);
  const orphans = findOrphans(edges);
  if (orphans.length === 0) {
    console.log('Nenhum resultado sem procedencia encontrado.');
    return;
  }
  console.log(`Resultados sem procedencia (${orphans.length}):\n`);
  for (const o of orphans) {
    console.log(`  ${o.id} — ${o.summary} (${o.timestamp})`);
  }
}

function cmdStats(opts) {
  if (!opts.file) exit('Erro: --file obrigatorio para stats');
  const filePath = resolve(opts.file);
  if (!existsSync(filePath)) exit(`Erro: arquivo nao encontrado: ${filePath}`);
  const raw = readFileSync(filePath, 'utf-8');
  const edges = parseJsonl(raw);
  const stats = computeStats(edges);
  console.log(`Total de elos: ${stats.total}`);
  console.log(`Profundidade media: ${stats.avgDepth}`);
  console.log('\nPor tipo:');
  for (const [tipo, count] of Object.entries(stats.byType)) {
    console.log(`  ${tipo}: ${count}`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
  console.log(usage());
  process.exit(0);
}

const command = args[0];
const rest = args.slice(1);

if (!['link', 'chain', 'orphans', 'stats'].includes(command)) {
  exit(`Comando desconhecido: '${command}'. Use node cli.mjs --help`);
}

const opts = parseArgs(rest);

try {
  if (command === 'link') cmdLink(opts);
  else if (command === 'chain') cmdChain(opts);
  else if (command === 'orphans') cmdOrphans(opts);
  else if (command === 'stats') cmdStats(opts);
} catch (err) {
  exit(`Erro inesperado: ${err.message}`);
}
