// agent-trust-passport — logica pura de passaporte de agente
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { createHash } from "node:crypto";

function newPassport(name, permissions = [], tools = []) {
  const now = new Date().toISOString();
  const history = permissions.map((p) => ({
    action: "grant",
    permission: p,
    date: now,
    reason: "initial grant",
  }));
  const passport = {
    identity: { id: crypto.randomUUID(), name, version: "1.0.0" },
    permissions: [...permissions],
    tools: [...tools],
    history,
    incident: [],
    hash: "",
  };
  passport.hash = computeHash(passport);
  return passport;
}

function grantPermission(passport, permission, reason = "granted") {
  if (passport.permissions.includes(permission)) {
    return { ok: false, error: "permissao ja concedida" };
  }
  const now = new Date().toISOString();
  passport.permissions.push(permission);
  passport.history.push({ action: "grant", permission, date: now, reason });
  passport.hash = computeHash(passport);
  return { ok: true };
}

function revokePermission(passport, permission, reason = "revoked") {
  const idx = passport.permissions.indexOf(permission);
  if (idx === -1) {
    return { ok: false, error: "permissao nao encontrada" };
  }
  const now = new Date().toISOString();
  passport.permissions.splice(idx, 1);
  passport.history.push({ action: "revoke", permission, date: now, reason });
  passport.hash = computeHash(passport);
  return { ok: true };
}

function recordIncident(passport, severity, description) {
  const now = new Date().toISOString();
  passport.incident.push({ date: now, severity, description });
  passport.hash = computeHash(passport);
  return { ok: true };
}

function computeHash(passport) {
  const copy = { ...passport };
  copy.hash = "";
  const canonical = JSON.stringify(copy, Object.keys(copy).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

function verifyIntegrity(passport) {
  const expected = computeHash(passport);
  const valid = expected === passport.hash;
  return { ok: valid, expected, found: passport.hash };
}

function validatePassport(passport) {
  const errors = [];
  if (!passport.identity) {
    errors.push("identidade ausente");
  } else {
    if (!passport.identity.id) errors.push("identity.id ausente");
    if (!passport.identity.name) errors.push("identity.name ausente");
    if (!passport.identity.version) errors.push("identity.version ausente");
  }
  if (!Array.isArray(passport.permissions))
    errors.push("permissions deve ser array");
  if (!Array.isArray(passport.tools)) errors.push("tools deve ser array");
  if (!Array.isArray(passport.history)) errors.push("history deve ser array");
  if (!Array.isArray(passport.incident)) errors.push("incident deve ser array");
  if (typeof passport.hash !== "string") errors.push("hash deve ser string");
  if (passport.history) {
    for (const [i, h] of passport.history.entries()) {
      if (!h.action) errors.push(`history[${i}].action ausente`);
      if (!h.permission) errors.push(`history[${i}].permission ausente`);
      if (!h.date) errors.push(`history[${i}].date ausente`);
      if (!h.reason) errors.push(`history[${i}].reason ausente`);
    }
  }
  if (passport.incident) {
    for (const [i, inc] of passport.incident.entries()) {
      if (!inc.date) errors.push(`incident[${i}].date ausente`);
      if (!inc.severity) errors.push(`incident[${i}].severity ausente`);
      if (!inc.description) errors.push(`incident[${i}].description ausente`);
    }
  }
  if (errors.length) return { ok: false, errors };
  const integrity = verifyIntegrity(passport);
  if (!integrity.ok) {
    errors.push("hash de integridade nao confere");
    return { ok: false, errors };
  }
  return { ok: true, errors: [], hash: integrity.expected };
}

export {
  newPassport,
  grantPermission,
  revokePermission,
  recordIncident,
  computeHash,
  verifyIntegrity,
  validatePassport,
};
