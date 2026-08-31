#!/usr/bin/env node
// skill-poison-detector — CLI scanner estático de skills envenenadas
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependências externas.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname, relative } from "node:path";
import { RULES } from "./lib.mjs";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`Uso: node cli.mjs <arquivo ou pasta> [opções]

Opções:
  --help, -h     Mostra esta mensagem
  --json         Saída em formato JSON

Exemplos:
  node cli.mjs SKILL.md
  node cli.mjs ./minha-skill/ --json`);
  process.exit(0);
}

const useJson = args.includes("--json");
const paths = args.filter((a) => !a.startsWith("--"));

function collectFiles(target) {
  const results = [];
  try {
    const st = statSync(target);
    if (st.isFile()) {
      results.push(target);
    } else if (st.isDirectory()) {
      const entries = readdirSync(target);
      for (const e of entries) {
        const full = join(target, e);
        const est = statSync(full);
        if (est.isFile()) {
          results.push(full);
        } else if (est.isDirectory()) {
          results.push(...collectFiles(full));
        }
      }
    }
  } catch (err) {
    console.error(`Erro ao acessar ${target}: ${err.message}`);
  }
  return results;
}

function scanLine(line, lineNumber, filePath, basePath) {
  const findings = [];
  for (const rule of RULES) {
    const result = rule.test(line);
    if (result.match) {
      findings.push({
        path: relative(basePath, filePath).replace(/\\/g, "/"),
        line: lineNumber,
        severity: rule.severity,
        rule: rule.id,
        snippet: result.snippet || line.trim().slice(0, 100),
      });
    }
  }
  return findings;
}

function scanFile(filePath, basePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    findings.push(...scanLine(lines[i], i + 1, filePath, basePath));
  }
  return findings;
}

const basePath = resolve(".");
const allFindings = [];

for (const p of paths) {
  const files = collectFiles(resolve(p));
  for (const f of files) {
    allFindings.push(...scanFile(f, basePath));
  }
}

if (useJson) {
  console.log(JSON.stringify(allFindings, null, 2));
} else {
  for (const f of allFindings) {
    console.log(`${f.path}:${f.line} | ${f.severity} | ${f.rule} | ${f.snippet}`);
  }
  if (allFindings.length === 0) {
    console.log("Nenhuma ameaça detectada.");
  }
}

const hasHigh = allFindings.some((f) => f.severity === "alta");
process.exit(hasHigh ? 1 : 0);
