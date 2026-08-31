// agent-trust-passport — CLI para criar e gerenciar passaportes de agente
// Gerado por: mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  newPassport,
  grantPermission,
  revokePermission,
  recordIncident,
  validatePassport,
} from "./lib.mjs";

const HELP = `agent-trust-passport — passaporte de identidade de agente de IA

Uso:
  node cli.mjs init <arquivo> <nome> [--permissions p1,p2,...] [--tools t1,t2,...]
  node cli.mjs grant <arquivo> <permissao> [--reason "motivo"]
  node cli.mjs revoke <arquivo> <permissao> [--reason "motivo"]
  node cli.mjs incident <arquivo> <severidade> <descricao>
  node cli.mjs verify <arquivo>
  node cli.mjs --help

Comandos:
  init        Cria um passaporte novo com nome e permissoes iniciais
  grant       Adiciona uma permissao ao passaporte
  revoke      Remove uma permissao do passaporte
  incident    Registra um incidente no passaporte
  verify      Confere o hash de integridade do passaporte

Exemplos:
  node cli.mjs init meu.json "Assistente Alpha" --permissions read,write --tools fs,http
  node cli.mjs grant meu.json deploy --reason "deploy autorizado"
  node cli.mjs revoke meu.json deploy --reason "cesso temporario"
  node cli.mjs incident meu.json medio "tentativa de acesso nao autorizado"
  node cli.mjs verify meu.json`;

function parseArgs(args) {
  const result = { flags: {} };
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        result.flags[key] = args[i + 1];
        i += 2;
      } else {
        result.flags[key] = true;
        i++;
      }
    } else {
      if (!result.positional) result.positional = [];
      result.positional.push(args[i]);
      i++;
    }
  }
  return result;
}

function load(file) {
  const p = resolve(file);
  if (!existsSync(p)) {
    console.error(`Arquivo nao encontrado: ${p}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf-8"));
}

function save(file, passport) {
  writeFileSync(resolve(file), JSON.stringify(passport, null, 2) + "\n");
}

const args = parseArgs(process.argv.slice(2));
const cmd = args.positional?.[0];

if (!cmd || cmd === "--help") {
  console.log(HELP);
  process.exit(0);
}

switch (cmd) {
  case "init": {
    const file = args.positional[1];
    const name = args.positional[2];
    if (!file || !name) {
      console.error("Uso: init <arquivo> <nome> [--permissions p1,p2] [--tools t1,t2]");
      process.exit(1);
    }
    const perms = args.flags.permissions
      ? args.flags.permissions.split(",")
      : [];
    const tools = args.flags.tools ? args.flags.tools.split(",") : [];
    const passport = newPassport(name, perms, tools);
    save(file, passport);
    console.log(`Passaporte criado: ${file}`);
    console.log(`ID: ${passport.identity.id}`);
    console.log(`Permissoes (${passport.permissions.length}): ${passport.permissions.join(", ") || "nenhuma"}`);
    console.log(`Hash: ${passport.hash}`);
    break;
  }
  case "grant": {
    const file = args.positional[1];
    const perm = args.positional[2];
    if (!file || !perm) {
      console.error("Uso: grant <arquivo> <permissao> [--reason motivo]");
      process.exit(1);
    }
    const passport = load(file);
    const result = grantPermission(passport, perm, args.flags.reason || "granted");
    if (!result.ok) {
      console.error(`Erro: ${result.error}`);
      process.exit(1);
    }
    save(file, passport);
    console.log(`Permissao '${perm}' concedida.`);
    console.log(`Hash atualizado: ${passport.hash}`);
    break;
  }
  case "revoke": {
    const file = args.positional[1];
    const perm = args.positional[2];
    if (!file || !perm) {
      console.error("Uso: revoke <arquivo> <permissao> [--reason motivo]");
      process.exit(1);
    }
    const passport = load(file);
    const result = revokePermission(passport, perm, args.flags.reason || "revoked");
    if (!result.ok) {
      console.error(`Erro: ${result.error}`);
      process.exit(1);
    }
    save(file, passport);
    console.log(`Permissao '${perm}' revogada.`);
    console.log(`Hash atualizado: ${passport.hash}`);
    break;
  }
  case "incident": {
    const file = args.positional[1];
    const severity = args.positional[2];
    const desc = args.positional[3];
    if (!file || !severity || !desc) {
      console.error("Uso: incident <arquivo> <severidade> <descricao>");
      process.exit(1);
    }
    const passport = load(file);
    recordIncident(passport, severity, desc);
    save(file, passport);
    console.log(`Incidente registrado (${severity}): ${desc}`);
    console.log(`Hash atualizado: ${passport.hash}`);
    break;
  }
  case "verify": {
    const file = args.positional[1];
    if (!file) {
      console.error("Uso: verify <arquivo>");
      process.exit(1);
    }
    const passport = load(file);
    const result = validatePassport(passport);
    if (result.ok) {
      console.log("PASSAPORTE VALIDO");
      console.log(`Hash confirmado: ${result.hash}`);
    } else {
      console.error("PASSAPORTE INVALIDO");
      if (result.errors?.length) {
        for (const e of result.errors) console.error(`  - ${e}`);
      }
      process.exit(1);
    }
    break;
  }
  default:
    console.error(`Comando desconhecido: ${cmd}`);
    console.log(HELP);
    process.exit(1);
}
