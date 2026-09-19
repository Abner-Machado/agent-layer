// rag-expiration-engine — testes da lib
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseTTL, checkValidity, computeExpiration, getContentPolicy } from "./lib.mjs";

// --- parseTTL ---

describe("parseTTL", () => {
  it("parseia 30d como 30 dias em ms", () => {
    const ref = new Date("2026-08-01T00:00:00Z");
    const ms = parseTTL("30d", ref);
    assert.equal(ms, 30 * 24 * 60 * 60 * 1000);
  });

  it("parseia 6m como 6 meses em ms", () => {
    const ref = new Date("2026-08-01T00:00:00Z");
    const ms = parseTTL("6m", ref);
    assert.equal(ms, 6 * 30 * 24 * 60 * 60 * 1000);
  });

  it("parseia 1y como 1 ano em ms", () => {
    const ref = new Date("2026-08-01T00:00:00Z");
    const ms = parseTTL("1y", ref);
    assert.equal(ms, 365 * 24 * 60 * 60 * 1000);
  });

  it("retorna null para TTL nulo ou undefined", () => {
    assert.equal(parseTTL(null), null);
    assert.equal(parseTTL(undefined), null);
  });

  it("retorna timestamp para data ISO absoluta", () => {
    const ms = parseTTL("2026-12-31");
    assert.equal(ms, new Date("2026-12-31").getTime());
  });

  it("retorna null para TTL invalido", () => {
    assert.equal(parseTTL("abc"), null);
  });
});

// --- checkValidity ---

describe("checkValidity", () => {
  const refDate = new Date("2026-09-15T00:00:00Z");

  it("documento sem validade definida (expiresAt=null) retorna no_expiry", () => {
    const result = checkValidity(null, refDate);
    assert.equal(result.valid, true);
    assert.equal(result.status, "no_expiry");
    assert.equal(result.daysLeft, null);
  });

  it("documento expirado retorna expired", () => {
    const result = checkValidity("2026-09-01", refDate);
    assert.equal(result.valid, false);
    assert.equal(result.status, "expired");
    assert.ok(result.daysLeft < 0);
  });

  it("vence exatamente no proprio dia (fronteira) retorna expires_today e invalido", () => {
    const result = checkValidity("2026-09-15", refDate);
    assert.equal(result.valid, false);
    assert.equal(result.status, "expires_today");
    assert.equal(result.daysLeft, 0);
  });

  it("vence amanha retorna valid com 1 dia restante", () => {
    const result = checkValidity("2026-09-16", refDate);
    assert.equal(result.valid, true);
    assert.equal(result.status, "valid");
    assert.equal(result.daysLeft, 1);
  });

  it("vence em 30 dias retorna valid", () => {
    const result = checkValidity("2026-10-15", refDate);
    assert.equal(result.valid, true);
    assert.equal(result.status, "valid");
    assert.equal(result.daysLeft, 30);
  });

  it("expiresAt ilegivel e invalido (fail-closed), nao 'sem validade'", () => {
    const result = checkValidity("data-invalida", refDate);
    assert.equal(result.valid, false);
    assert.equal(result.status, "invalid_expiry");
    assert.equal(result.daysLeft, null);
  });
});

// --- computeExpiration ---

describe("computeExpiration", () => {
  const ref = new Date("2026-08-01T00:00:00Z");

  it("30d retorna data +30 dias", () => {
    const result = computeExpiration("30d", ref);
    const expected = new Date(ref.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(result, expected);
  });

  it("never retorna null", () => {
    assert.equal(computeExpiration(null, ref), null);
  });

  it("data absoluta retorna ela mesma", () => {
    const result = computeExpiration("2027-01-01", ref);
    assert.equal(result, new Date("2027-01-01").toISOString());
  });
});

// --- getContentPolicy ---

describe("getContentPolicy", () => {
  it("preco retorna TTL de 30d", () => {
    const p = getContentPolicy("preco");
    assert.equal(p.defaultTTL, "30d");
  });

  it("definicao conceitual retorna null (nao vence)", () => {
    const p = getContentPolicy("definicao conceitual");
    assert.equal(p.defaultTTL, null);
  });

  it("tipo desconhecido retorna politica default", () => {
    const p = getContentPolicy("qualquer-coisa");
    assert.equal(p.defaultTTL, "6m");
  });
});

// --- CLI: caminho de falha ---

describe("cli stamp", () => {
  const CLI = fileURLToPath(new URL("./cli.mjs", import.meta.url));

  function run(cwd, ...args) {
    try {
      const stdout = execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      return { code: 0, stdout, stderr: "" };
    } catch (err) {
      return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
    }
  }

  it("TTL com erro de digitacao sai com 1 e nao grava nada", () => {
    const dir = mkdtempSync(join(tmpdir(), "ree-"));
    try {
      writeFileSync(join(dir, "doc.md"), "x\n");
      const r = run(dir, "stamp", "doc.md", "30dias");
      assert.equal(r.code, 1);
      assert.match(r.stderr, /TTL invalido: 30dias/);
      assert.equal(existsSync(join(dir, ".rag-expiration-index.json")), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("TTL valido continua gravando e 'never' continua aceito", () => {
    const dir = mkdtempSync(join(tmpdir(), "ree-"));
    try {
      writeFileSync(join(dir, "a.md"), "x\n");
      writeFileSync(join(dir, "b.md"), "x\n");
      assert.equal(run(dir, "stamp", "a.md", "30d").code, 0);
      assert.equal(run(dir, "stamp", "b.md", "never").code, 0);
      const index = JSON.parse(readFileSync(join(dir, ".rag-expiration-index.json"), "utf8"));
      const entries = Object.values(index);
      assert.equal(entries.length, 2);
      assert.ok(entries.some(e => e.ttl === "30d" && e.expiresAt !== null));
      assert.ok(entries.some(e => e.ttl === null && e.expiresAt === null));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("check lista data ilegivel no indice como invalida, nao como 'sem validade'", () => {
    const dir = mkdtempSync(join(tmpdir(), "ree-"));
    try {
      const file = join(dir, "doc.md");
      writeFileSync(file, "x\n");
      writeFileSync(join(dir, ".rag-expiration-index.json"), JSON.stringify({
        [file]: { file, stampedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-13-45", ttl: "30d", ttlMs: 1, contentType: null },
      }));
      const r = run(dir, "check", "--directory", dir);
      assert.equal(r.code, 0);
      assert.match(r.stdout, /ILEGIVEL/);
      assert.doesNotMatch(r.stdout, /SEM VALIDADE DEFINIDA/);
      const f = run(dir, "filter", "--date", "2026-01-02", "--directory", dir);
      assert.match(f.stdout, /\(nenhum\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
