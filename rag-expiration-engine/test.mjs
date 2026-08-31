// rag-expiration-engine — testes da lib
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

  it("expiresAt invalido retorna no_expiry", () => {
    const result = checkValidity("data-invalida", refDate);
    assert.equal(result.valid, true);
    assert.equal(result.status, "no_expiry");
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
