// agent-honeypot-detector — CLI para analise de honeypots em HTML
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyze } from './lib.mjs';

const args = process.argv.slice(2);

function help() {
  console.log(`
agent-honeypot-detector v0.1.0

Uso:
  node cli.mjs <caminho-do-html> [opcoes]

Opcoes:
  --json     Saida em formato JSON
  --help     Mostra esta mensagem

Sinais detectados (6 regras):
  1. Instrucao direcionada a agente em texto invisivel
  2. Comentario HTML falando com o agente
  3. Divergencia entre texto visivel e total
  4. Atributo suspeito (aria-label, alt, title) com ordem
  5. Meta tag ou JSON-LD com instrucao imperativa
  6. Caractere de largura zero ou override bidirecional

Vereditos:
  confiavel  — nenhum sinal significativo
  suspeito   — sinais moderados, merece revisao
  hostil     — padrao claro de manipulacao de agente

Exemplo:
  node cli.mjs exemplos/honeypot.html
  node cli.mjs exemplos/limpo.html --json
`);
}

function main() {
  if (args.includes('--help') || args.length === 0) {
    help();
    process.exit(0);
  }

  const jsonMode = args.includes('--json');
  const filePath = args.find(a => !a.startsWith('--'));

  if (!filePath) {
    console.error('Erro: caminho do arquivo HTML nao informado.');
    process.exit(2);
  }

  const fullPath = resolve(filePath);
  let html;
  try {
    html = readFileSync(fullPath, 'utf-8');
  } catch (e) {
    console.error(`Erro: nao foi possivel ler o arquivo: ${fullPath}`);
    console.error(e.message);
    process.exit(2);
  }

  const result = analyze(html);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n=== agent-honeypot-detector v0.1.0 ===`);
    console.log(`Arquivo: ${filePath}`);
    console.log(`\n--- Regras ---`);
    for (const r of result.rules) {
      const bar = '█'.repeat(Math.round(r.score / 5)) + '░'.repeat(20 - Math.round(r.score / 5));
      console.log(`  ${r.score.toString().padStart(3)}  ${bar}  ${r.description}`);
      if (r.findings.length > 0) {
        for (const f of r.findings) {
          const snippet = f.text || f.value || f.snippet || f.context || JSON.stringify(f);
          console.log(`       ↳ ${snippet.slice(0, 120)}`);
        }
      }
    }
    console.log(`\n--- Veredito ---`);
    const icon = result.verdict === 'hostil' ? '🚨' : result.verdict === 'suspeito' ? '⚠️' : '✅';
    console.log(`  ${icon}  ${result.verdict.toUpperCase()}`);
    if (result.triggers.length > 0) {
      console.log(`\n  Trechos que causaram o veredito:`);
      for (const t of result.triggers) {
        console.log(`    [${t.rule} score=${t.score}] ${JSON.stringify(t.text || t.value || t.context || '').slice(0, 120)}`);
      }
    }
    console.log('');
  }

  if (result.verdict === 'hostil') {
    process.exit(1);
  }
}

main();
