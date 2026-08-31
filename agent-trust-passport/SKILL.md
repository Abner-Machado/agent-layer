---
name: agent-trust-passport
description: >-
  Use quando precisa criar, consultar ou verificar a identidade e permissoes de
  um agente de IA — quem ele e, o que pode fazer, historico de acoes e incidentes.
  Tambem use para validar integridade de passaportes existentes com hash SHA-256.
  Nao use para autenticacao de usuarios ou gerenciamento de chaves de API.
---

# agent-trust-passport

Um passaporte JSON portatil que viaja com o agente, registrando identidade,
permissoes, historico e incidentes. Hash de integridade previne adulteracao.

## Como um agente usa

### Criar passaporte
```bash
node cli.mjs init meu-passaporte.json "Nome do Agente" --permissions read,write --tools fs,http
```

### Conceder permissao
```bash
node cli.mjs grant meu-passaporte.json deploy --reason "deploy aprovado pelo operador"
```

### Revogar permissao
```bash
node cli.mjs revoke meu-passaporte.json deploy --reason "cesso temporaria encerrada"
```

### Registrar incidente
```bash
node cli.mjs incident meu-passaporte.json medio "tentativa de acesso nao autorizado"
```

### Verificar integridade
```bash
node cli.mjs verify meu-passaporte.json
```

## Formato do passaporte

```json
{
  "identity": { "id": "uuid", "name": "Agente", "version": "1.0.0" },
  "permissions": ["read", "write"],
  "tools": ["fs", "http"],
  "history": [
    { "action": "grant", "permission": "read", "date": "2026-08-30T...", "reason": "initial grant" }
  ],
  "incident": [
    { "date": "2026-08-30T...", "severity": "alto", "description": "..." }
  ],
  "hash": "sha256..."
}
```

## Biblioteca (lib.mjs)

```js
import { newPassport, grantPermission, revokePermission, recordIncident, validatePassport } from "./lib.mjs";
```

Toda operacao que altera o passaporte atualiza o hash automaticamente.
