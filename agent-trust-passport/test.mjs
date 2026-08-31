// agent-trust-passport — testes do passaporte de agente
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  newPassport,
  grantPermission,
  revokePermission,
  recordIncident,
  verifyIntegrity,
  validatePassport,
  computeHash,
} from "./lib.mjs";

describe("agent-trust-passport", () => {
  it("cria passaporte valido com campos obrigatorios", () => {
    const p = newPassport("TestBot", ["read"], ["fs"]);
    assert.equal(p.identity.name, "TestBot");
    assert.equal(p.permissions.length, 1);
    assert.equal(p.tools.length, 1);
    assert.equal(p.history.length, 1);
    assert.equal(p.history[0].action, "grant");
    assert.equal(p.incident.length, 0);
    assert.ok(p.hash.length > 0);
    const v = validatePassport(p);
    assert.ok(v.ok, `erros: ${v.errors?.join(", ")}`);
  });

  it("concede permissao e registra no historico", () => {
    const p = newPassport("Bot");
    const r = grantPermission(p, "deploy", "precisa de deploy");
    assert.ok(r.ok);
    assert.ok(p.permissions.includes("deploy"));
    assert.equal(p.history.length, 1);
    assert.equal(p.history[0].action, "grant");
    assert.equal(p.history[0].permission, "deploy");
    assert.equal(p.history[0].reason, "precisa de deploy");
  });

  it("rejeita concessao de permissao duplicada", () => {
    const p = newPassport("Bot", ["read"]);
    const r = grantPermission(p, "read");
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("ja concedida"));
    assert.equal(p.permissions.length, 1);
  });

  it("revoga permissao e remove da lista", () => {
    const p = newPassport("Bot", ["read", "write"]);
    const r = revokePermission(p, "write", "cesso expirada");
    assert.ok(r.ok);
    assert.ok(!p.permissions.includes("write"));
    assert.equal(p.permissions.length, 1);
    assert.equal(p.history.length, 3);
    const revokeEntry = p.history[2];
    assert.equal(revokeEntry.action, "revoke");
    assert.equal(revokeEntry.reason, "cesso expirada");
  });

  it("rejeita revogacao de permissao inexistente", () => {
    const p = newPassport("Bot", ["read"]);
    const r = revokePermission(p, "admin");
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("nao encontrada"));
    assert.deepEqual(p.permissions, ["read"]);
  });

  it("registra incidente com data e severidade", () => {
    const p = newPassport("Bot");
    recordIncident(p, "alto", "acesso nao autorizado detectado");
    assert.equal(p.incident.length, 1);
    assert.equal(p.incident[0].severity, "alto");
    assert.equal(p.incident[0].description, "acesso nao autorizado detectado");
    assert.ok(p.incident[0].date.length > 0);
  });

  it("hash muda apos cada operacao", () => {
    const p = newPassport("Bot");
    const h1 = p.hash;
    grantPermission(p, "read");
    const h2 = p.hash;
    revokePermission(p, "read");
    const h3 = p.hash;
    recordIncident(p, "baixo", "teste");
    const h4 = p.hash;
    assert.notEqual(h1, h2);
    assert.notEqual(h2, h3);
    assert.notEqual(h3, h4);
  });

  it("verify detecta passaporte integro", () => {
    const p = newPassport("Bot", ["read"]);
    const r = verifyIntegrity(p);
    assert.ok(r.ok);
    assert.equal(r.expected, r.found);
  });

  it("verify rejeita passaporte adulterado", () => {
    const p = newPassport("Bot", ["read"]);
    const original = p.hash;
    p.hash = "0".repeat(64);
    const r = verifyIntegrity(p);
    assert.equal(r.ok, false);
    assert.equal(r.expected, original);
    assert.equal(r.found, "0".repeat(64));
  });

  it("validatePassport rejeita estrutura invalida", () => {
    const r1 = validatePassport({});
    assert.equal(r1.ok, false);
    assert.ok(r1.errors.length > 0);
    const r2 = validatePassport({ identity: {}, permissions: "nope" });
    assert.equal(r2.ok, false);
  });

  it("cli verify com passaporte adulterado nao quebra e mostra erro", () => {
    const cliPath = join(import.meta.dirname, "cli.mjs");
    const tmpFile = join(import.meta.dirname, "_tmp_test_adulterado.json");
    const p = newPassport("BotTest", ["read"]);
    p.hash = "0".repeat(64);
    writeFileSync(tmpFile, JSON.stringify(p, null, 2));
    try {
      execSync(`node ${cliPath} verify ${tmpFile}`, { encoding: "utf-8" });
      assert.fail("deveria ter saido com codigo 1");
    } catch (err) {
      assert.equal(err.status, 1);
      assert.ok(err.stdout.includes("PASSAPORTE INVALIDO") || err.stderr.includes("PASSAPORTE INVALIDO"));
      assert.ok(!err.stderr.includes("TypeError"));
    } finally {
      unlinkSync(tmpFile);
    }
  });
});
