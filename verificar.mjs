// verificar.mjs — Verifica saude de um repositorio multi-skill
// Gerado por: opencode/mimo-v2.5-free em 2026-08-31. Sem dependencias externas.
//
// EXCECAO A REGRA DE SEGURANCA: Este arquivo usa node:child_process (spawnSync)
// porque o objetivo e EXECUTAR os test.mjs de cada skill como processos separados.
// O briefing proibe child_process em skills que processam dados do usuario, mas
// este arquivo e um verificador de repo — ele so le o diretorio, descobre skills,
// e roda cada test.mjs como subprocesso. Nao processa entrada do usuario nem
// grava dados. O uso e estritamente: spawnSync(process.execPath, ['--test', caminho]).

import { readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseTestOutput(stdout, stderr) {
  const combined = `${stdout}\n${stderr}`;

  // Try Node.js 22+ summary format: "ℹ pass N" / "ℹ fail N"
  const infoPassMatch = combined.match(/ℹ\s+pass\s+(\d+)/);
  const infoFailMatch = combined.match(/ℹ\s+fail\s+(\d+)/);
  if (infoPassMatch || infoFailMatch) {
    const passed = infoPassMatch ? parseInt(infoPassMatch[1], 10) : 0;
    const failed = infoFailMatch ? parseInt(infoFailMatch[1], 10) : 0;
    return { total: passed + failed, passed, failed };
  }

  // Try classic TAP summary: "N tests, N passed, N failed"
  const summaryMatch = combined.match(/(\d+)\s+tests?\s*[|,]\s*(\d+)\s+pass(?:ed|es)?\s*[|,]\s*(\d+)\s+fail(?:ed|ures?)?/i);
  if (summaryMatch) {
    return {
      total: parseInt(summaryMatch[1], 10),
      passed: parseInt(summaryMatch[2], 10),
      failed: parseInt(summaryMatch[3], 10)
    };
  }

  // Fallback: count ✔/✖ or ok/not ok lines
  const lines = combined.replace(/\r\n/g, '\n').split('\n');
  let passed = 0;
  let failed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+\.\.\./.test(trimmed)) continue;
    if (/^ℹ\s/.test(trimmed)) continue;
    if (/^TAP version/i.test(trimmed)) continue;

    // Node 22+ format: ✔ and ✖
    if (/^[✔✓]\s/.test(trimmed)) {
      passed++;
      continue;
    }
    if (/^[✖✗]\s/.test(trimmed)) {
      failed++;
      continue;
    }

    // Classic TAP: ok and not ok
    if (/^ok\s/i.test(trimmed)) {
      passed++;
    } else if (/^not\s+ok\s/i.test(trimmed)) {
      failed++;
    }
  }

  return { total: passed + failed, passed, failed };
}

function discoverSkills(basePath) {
  const entries = readdirSync(basePath, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

    const testPath = join(basePath, entry.name, 'test.mjs');
    if (existsSync(testPath)) {
      skills.push({ name: entry.name, testPath: resolve(testPath) });
    }
  }

  return skills;
}

function runTests(skills) {
  const results = [];

  for (const skill of skills) {
    const result = spawnSync(process.execPath, ['--test', skill.testPath], {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

    if (result.error) {
      results.push({
        name: skill.name,
        tests: 0,
        passed: 0,
        failed: 1,
        ok: false,
        error: result.error.message
      });
      continue;
    }

    const counts = parseTestOutput(stdout, stderr);
    const ok = counts.failed === 0 && counts.total > 0;

    results.push({
      name: skill.name,
      tests: counts.total,
      passed: counts.passed,
      failed: counts.failed,
      ok
    });
  }

  return results;
}

function printTable(results) {
  const nameW = Math.max(4, ...results.map(r => r.name.length));
  const testW = Math.max(5, ...results.map(r => String(r.tests).length));
  const passW = Math.max(6, ...results.map(r => String(r.passed).length));
  const failW = Math.max(6, ...results.map(r => String(r.failed).length));

  const header = [
    'Skill'.padEnd(nameW),
    'Testes'.padStart(testW),
    'Passou'.padStart(passW),
    'Falhou'.padStart(failW),
    'Status'
  ].join(' | ');

  const sep = [
    '-'.repeat(nameW),
    '-'.repeat(testW),
    '-'.repeat(passW),
    '-'.repeat(failW),
    '------'
  ].join('-+-');

  console.log(header);
  console.log(sep);

  for (const r of results) {
    const status = r.ok ? '  ok' : 'FALHA';
    const row = [
      r.name.padEnd(nameW),
      String(r.tests).padStart(testW),
      String(r.passed).padStart(passW),
      String(r.failed).padStart(failW),
      status
    ].join(' | ');
    console.log(row);
  }

  console.log(sep);

  const totalTests = results.reduce((s, r) => s + r.tests, 0);
  const totalPassed = results.reduce((s, r) => s + r.passed, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const allOk = results.every(r => r.ok);

  const totalRow = [
    'TOTAL'.padEnd(nameW),
    String(totalTests).padStart(testW),
    String(totalPassed).padStart(passW),
    String(totalFailed).padStart(failW),
    allOk ? '  ok' : 'FALHA'
  ].join(' | ');
  console.log(totalRow);

  return allOk;
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  const skills = discoverSkills(__dirname);

  if (skills.length === 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: 'Nenhuma skill encontrada', skills: [] }));
    } else {
      console.log('Nenhuma skill com test.mjs encontrada no repositorio.');
    }
    process.exit(2);
  }

  const results = runTests(skills);

  if (jsonMode) {
    const totalTests = results.reduce((s, r) => s + r.tests, 0);
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const allOk = results.every(r => r.ok);

    console.log(JSON.stringify({
      skills: results,
      total: { tests: totalTests, passed: totalPassed, failed: totalFailed },
      ok: allOk
    }, null, 2));
  } else {
    const allOk = printTable(results);
    process.exit(allOk ? 0 : 1);
  }
}

main();
