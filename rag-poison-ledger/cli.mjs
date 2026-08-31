#!/usr/bin/env node
// rag-poison-ledger — CLI com comandos record, flag, blast, trace

import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createEntry,
  createFlag,
  createCorrection,
  parseJsonl,
  toJsonl,
  blast as doBlast,
  trace as doTrace,
  docStatus,
} from "./lib.mjs";

const HELP = `rag-poison-ledger — ledger append-only que liga documentos RAG a respostas de agentes

Uso:
  node cli.mjs record <ledger> <response-id> <doc-id>[,<doc-id>...] [--text "texto da resposta"]
  node cli.mjs flag   <ledger> <doc-id> <status> <by> [--why "motivo"]
  node cli.mjs blast  <ledger> <doc-id>
  node cli.mjs trace  <ledger> <response-id>
  node cli.mjs status <ledger> <doc-id>
  node cli.mjs --help

Comandos:
  record   Registra uma resposta junto com os ids dos documentos que a alimentaram.
  flag     Marca um documento como poisoned ou incorrect.
  blast    Encontra todas as respostas que usaram um documento (mais recente primeiro).
  trace    Encontra todos os documentos que alimentaram uma resposta.
  status   Mostra o status atual de um documento.

Valores de status para flag: poisoned, incorrect.
Status de correcao (criado automaticamente ao dar flag): poisoned, incorrect, clean.

O ledger e um arquivo JSONL (append-only). Linhas antigas nunca sao modificadas.`;

function loadLedger(path) {
  if (!existsSync(path)) return [];
  return parseJsonl(readFileSync(path, "utf8"));
}

function appendLine(path, obj) {
  appendFileSync(path, toJsonl(obj) + "\n", "utf8");
}

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--text" && argv[i + 1]) {
      flags.text = argv[++i];
    } else if (argv[i] === "--why" && argv[i + 1]) {
      flags.why = argv[++i];
    } else if (argv[i] === "--help") {
      flags.help = true;
    } else {
      args.push(argv[i]);
    }
  }
  return { args, flags };
}

function isInvalidId(value) {
  return !value || value.startsWith("-");
}

function validateId(value, label, usage) {
  if (!value) {
    console.error(`Erro: ${label} e obrigatorio.\n${usage}`);
    process.exit(2);
  }
  if (value.startsWith("-")) {
    console.error(`Erro: ${label} nao pode comecar com hifen: "${value}"\n${usage}`);
    process.exit(2);
  }
}

const [command, ...rest] = process.argv.slice(2);
const { args, flags } = parseArgs(rest);

if (!command || command === "--help" || flags.help) {
  console.log(HELP);
  process.exit(0);
}

const ledgerPath = args[0];
if (!ledgerPath) {
  console.error("Erro: caminho do ledger e obrigatorio como primeiro argumento.");
  process.exit(1);
}
if (ledgerPath.startsWith("-")) {
  console.error(`Erro: caminho do ledger nao pode comecar com hifen: "${ledgerPath}"`);
  process.exit(1);
}
const resolved = resolve(ledgerPath);

try {
  switch (command) {
    case "record": {
      const [, responseId, docIdsRaw] = args;
      const usage = "Uso: record <ledger> <response-id> <doc-id>[,<doc-id>...] [--text \"texto\"]";

      if (responseId === undefined || docIdsRaw === undefined) {
        console.error(`Erro: response-id e doc-id(s) sao obrigatorios.\n${usage}`);
        process.exit(2);
      }

      validateId(responseId, "response-id", usage);

      if (docIdsRaw === "") {
        console.error(`Erro: lista de documentos vazia.\n${usage}`);
        process.exit(2);
      }

      if (docIdsRaw.startsWith("-")) {
        console.error(`Erro: doc-id(s) nao pode comecar com hifen: "${docIdsRaw}"\n${usage}`);
        process.exit(2);
      }

      const docIds = docIdsRaw.split(",").map((d) => d.trim()).filter(Boolean);

      if (docIds.length === 0) {
        console.error(`Erro: lista de documentos vazia.\n${usage}`);
        process.exit(2);
      }

      for (const d of docIds) {
        if (d.startsWith("-")) {
          console.error(`Erro: doc-id nao pode comecar com hifen: "${d}"\n${usage}`);
          process.exit(2);
        }
      }

      const entry = createEntry(responseId, docIds, flags.text || "");
      appendLine(resolved, entry);
      console.log(`Resposta "${responseId}" registrada com ${docIds.length} documento(s).`);
      break;
    }

    case "flag": {
      const [, docId, status, by] = args;
      const usage = "Uso: flag <ledger> <doc-id> <poisoned|incorrect> <by> [--why \"motivo\"]";

      if (!docId || !status || !by) {
        console.error(`Erro: doc-id, status e by sao obrigatorios.\n${usage}`);
        process.exit(2);
      }

      validateId(docId, "doc-id", usage);

      if (status.startsWith("-")) {
        console.error(`Erro: status nao pode comecar com hifen: "${status}"\n${usage}`);
        process.exit(2);
      }

      if (!["poisoned", "incorrect"].includes(status)) {
        console.error(`Erro: status deve ser "poisoned" ou "incorrect", recebido: "${status}"\n${usage}`);
        process.exit(2);
      }

      validateId(by, "by", usage);

      const flagLine = createFlag(docId, status, by, flags.why || "");
      appendLine(resolved, flagLine);
      console.log(`Documento "${docId}" marcado como ${status} por ${by}.`);
      break;
    }

    case "blast": {
      const [, docId] = args;
      const usage = "Uso: blast <ledger> <doc-id>";

      if (!docId) {
        console.error(`Erro: doc-id e obrigatorio.\n${usage}`);
        process.exit(2);
      }

      validateId(docId, "doc-id", usage);

      const lines = loadLedger(resolved);
      const results = doBlast(docId, lines);
      if (results.length === 0) {
        console.log(`Nenhuma resposta usou o documento "${docId}".`);
      } else {
        console.log(`${results.length} resposta(s) usaram o documento "${docId}":\n`);
        for (const r of results) {
          const date = new Date(r.ts).toISOString();
          const st = r.docStatus ? r.docStatus.status : "clean";
          console.log(`  [${date}] ${r.id} — status: ${st}`);
          if (r.text) console.log(`    texto: ${r.text}`);
          console.log(`    docs: ${r.docs.join(", ")}`);
        }
      }
      break;
    }

    case "trace": {
      const [, responseId] = args;
      const usage = "Uso: trace <ledger> <response-id>";

      if (!responseId) {
        console.error(`Erro: response-id e obrigatorio.\n${usage}`);
        process.exit(2);
      }

      validateId(responseId, "response-id", usage);

      const lines = loadLedger(resolved);
      const result = doTrace(responseId, lines);
      if (!result.entry) {
        console.error(`Resposta "${responseId}" nao encontrada.`);
        process.exit(1);
      }
      const date = new Date(result.entry.ts).toISOString();
      console.log(`Resposta "${responseId}" em ${date}:\n`);
      if (result.entry.text) console.log(`  texto: ${result.entry.text}\n`);
      if (result.documents.length === 0) {
        console.log("  Nenhum documento registrado para esta resposta.");
      } else {
        console.log(`  ${result.documents.length} documento(s):`);
        for (const d of result.documents) {
          const st = d.status || "clean";
          console.log(`    ${d.docId} — ${st}${d.by ? ` (por ${d.by})` : ""}`);
          if (d.why) console.log(`      motivo: ${d.why}`);
        }
      }
      break;
    }

    case "status": {
      const [, docId] = args;
      const usage = "Uso: status <ledger> <doc-id>";

      if (!docId) {
        console.error(`Erro: doc-id e obrigatorio.\n${usage}`);
        process.exit(2);
      }

      validateId(docId, "doc-id", usage);

      const lines = loadLedger(resolved);
      const s = docStatus(docId, lines);
      if (!s.status) {
        console.log(`Documento "${docId}" esta clean (sem flags).`);
      } else {
        console.log(`Documento "${docId}" esta ${s.status} (por ${s.by})${s.why ? `: ${s.why}` : ""}`);
      }
      break;
    }

    default:
      console.error(`Comando desconhecido: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
} catch (err) {
  console.error(`Erro inesperado: ${err.message}`);
  process.exit(1);
}
