#!/usr/bin/env node
// rag-expiration-engine — CLI para gerenciar validade temporal de documentos RAG
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parseTTL, checkValidity, computeExpiration, getContentPolicy } from "./lib.mjs";

const HELP = `
rag-expiration-engine — validade temporal para base RAG

Uso:
  node cli.mjs stamp <arquivo> <ttl> [--type <tipo>]    Adiciona metadado de validade
  node cli.mjs check [--directory <dir>]                 Lista documentos por status
  node cli.mjs filter <arquivo1> [arquivo2...] --date <data> [--directory <dir>]
                                                         Retorna apenas documentos validos

  node cli.mjs --help                                    Mostra esta ajuda

TTL aceito:
  Relativo:  30d, 6m, 1y, 90d, 2y, etc.
  Absoluto:  2026-12-31 (data ISO)
  Nulo:      "never" (nao vence)

Tipos de conteudo suportados (politica padrao):
  preco, versao, definicao, tutorial, nota de release, changelog, contato, politica

Exemplos:
  node cli.mjs stamp docs/precos.md 30d --type preco
  node cli.mjs stamp docs/api.md never
  node cli.mjs check --directory docs/
  node cli.mjs filter docs/*.md --date 2026-09-15 --directory docs/
`.trim();

function getIndexPath(directory) {
  return resolve(directory, ".rag-expiration-index.json");
}

function loadIndex(indexPath) {
  if (!existsSync(indexPath)) return {};
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveIndex(indexPath, index) {
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

function cmdStamp(args) {
  if (args.length < 2) {
    console.error("Erro: uso node cli.mjs stamp <arquivo> <ttl> [--type <tipo>]");
    process.exit(1);
  }
  const filePath = resolve(args[0]);
  const ttl = args[1] === "never" ? null : args[1];
  const typeIdx = args.indexOf("--type");
  const contentType = typeIdx !== -1 ? args[typeIdx + 1] : null;

  const referenceDate = new Date();
  let expiresAt = null;
  let ttlMs = null;

  if (ttl !== null) {
    expiresAt = computeExpiration(ttl, referenceDate);
    ttlMs = parseTTL(ttl, referenceDate);
  }

  const entry = {
    file: filePath,
    stampedAt: referenceDate.toISOString(),
    expiresAt,
    ttl,
    ttlMs,
    contentType: contentType || null,
  };

  // Aplica politica padrao se tipo definido e TTL nao explicito
  if (contentType && ttl === null) {
    const policy = getContentPolicy(contentType);
    if (policy.defaultTTL) {
      entry.ttl = policy.defaultTTL;
      entry.expiresAt = computeExpiration(policy.defaultTTL, referenceDate);
      entry.ttlMs = parseTTL(policy.defaultTTL, referenceDate);
    }
  }

  const directory = dirname(filePath);
  const indexPath = getIndexPath(directory);
  const index = loadIndex(indexPath);
  index[filePath] = entry;
  saveIndex(indexPath, index);

  console.log(`OK: ${filePath}`);
  console.log(`  Stamped at: ${entry.stampedAt}`);
  console.log(`  Expires at: ${entry.expiresAt || "never"}`);
  console.log(`  TTL: ${entry.ttl || "none"}`);
  if (entry.contentType) console.log(`  Type: ${entry.contentType}`);
}

function cmdCheck(args) {
  const dirIdx = args.indexOf("--directory");
  const directory = dirIdx !== -1 ? resolve(args[dirIdx + 1]) : process.cwd();
  const indexPath = getIndexPath(directory);
  const index = loadIndex(indexPath);
  const now = new Date();

  if (Object.keys(index).length === 0) {
    console.log("Nenhum documento com validade registrado.");
    return;
  }

  const expired = [];
  const expiringSoon = [];
  const noExpiry = [];
  const valid = [];

  for (const [file, entry] of Object.entries(index)) {
    const result = checkValidity(entry.expiresAt, now);
    const info = { file, ...entry, ...result };

    if (result.status === "no_expiry") {
      noExpiry.push(info);
    } else if (result.status === "expired") {
      expired.push(info);
    } else if (result.status === "expires_today") {
      expiringSoon.push(info);
    } else if (result.daysLeft !== null && result.daysLeft <= 30) {
      expiringSoon.push(info);
    } else {
      valid.push(info);
    }
  }

  const printList = (label, items) => {
    if (items.length === 0) return;
    console.log(`\n--- ${label} (${items.length}) ---`);
    for (const item of items) {
      const extra = item.daysLeft !== null ? ` (${item.daysLeft}d restantes)` : "";
      console.log(`  ${item.file}${extra}`);
    }
  };

  console.log(`Status em ${now.toISOString()}`);
  printList("EXPIRADO", expired);
  printList("VENCENDO EM <= 30 DIAS", expiringSoon);
  printList("VALIDO", valid);
  printList("SEM VALIDADE DEFINIDA", noExpiry);
}

function cmdFilter(args) {
  const dateIdx = args.indexOf("--date");
  if (dateIdx === -1) {
    console.error("Erro: --date <data> obrigatorio no filter");
    process.exit(1);
  }
  const refDate = new Date(args[dateIdx + 1]);
  if (isNaN(refDate.getTime())) {
    console.error(`Erro: data invalida: ${args[dateIdx + 1]}`);
    process.exit(1);
  }

  const dirIdx = args.indexOf("--directory");
  const directory = dirIdx !== -1 ? resolve(args[dirIdx + 1]) : process.cwd();
  const indexPath = getIndexPath(directory);
  const index = loadIndex(indexPath);

  // Coleta arquivos: argumentos sao os caminhos ou glob nao suportado (usa index)
  const files = args.filter(a => !a.startsWith("--") && a !== args[dateIdx + 1] && (dirIdx === -1 || a !== args[dirIdx + 1]));
  const entries = files.length > 0
    ? files.map(f => ({ file: resolve(f), ...index[resolve(f)] })).filter(e => e.stampedAt)
    : Object.entries(index).map(([file, entry]) => ({ file, ...entry }));

  const valid = [];
  for (const entry of entries) {
    const result = checkValidity(entry.expiresAt, refDate);
    if (result.valid) {
      valid.push(entry.file);
    }
  }

  console.log(`Documentos validos em ${refDate.toISOString()}:`);
  if (valid.length === 0) {
    console.log("  (nenhum)");
  } else {
    for (const f of valid) console.log(`  ${f}`);
  }
}

// --- Main ---
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(HELP);
} else if (cmd === "stamp") {
  cmdStamp(args.slice(1));
} else if (cmd === "check") {
  cmdCheck(args.slice(1));
} else if (cmd === "filter") {
  cmdFilter(args.slice(1));
} else {
  console.error(`Comando desconhecido: ${cmd}`);
  console.error("Use --help para ver os comandos disponiveis.");
  process.exit(1);
}
