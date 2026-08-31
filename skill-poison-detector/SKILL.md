---
name: skill-poison-detector
description: >-
  Use quando precisar escanear SKILL.md ou arquivos de skills de agentes IA para detectar instruções maliciosas ou ocultas.
  Detecta 7 famílias de risco: injeção de regras, leitura de segredos, comandos destrutivos, exfiltração de dados,
  texto oculto, base64 suspeito e links não confiáveis.
  Não use para escanear código-fonte de aplicações ou arquivos que não são skills de agentes.
---

# skill-poison-detector

Scanner estático local que detecta instruções maliciosas escondidas em SKILL.md e arquivos auxiliares de skills de agentes IA.

## Como usar

### Via linha de comando

```bash
node cli.mjs <arquivo-ou-pasta>
node cli.mjs SKILL.md
node cli.mjs ./minha-skill/
node cli.mjs ./minha-skill/ --json
```

### Formato de saída

```
caminho/arquivo:linha | severidade | ID_DA_REGRA | trecho
```

Exemplo:
```
SKILL.md:5 | alta | INJECAO-REGRAS | ignore all previous instructions
```

### Exit code

- `0`: nenhuma ameaça alta encontrada
- `1`: pelo menos uma ameaça alta detectada

### Via JavaScript (import)

```js
import { RULES } from "./lib.mjs";

const rule = RULES.find(r => r.id === "INJECAO-REGRAS");
const result = rule.test("ignore all previous instructions");
console.log(result); // { match: true, snippet: "ignore all previous instructions" }
```

## Regras de detecção

| ID | Severidade | Descrição |
|---|---|---|
| INJECAO-REGRAS | alta | Instruções para ignorar/sobrescrever regras anteriores |
| LEITURA-SEGREDO | alta | Pedidos para ler .env, id_rsa, chaves, tokens, credenciais |
| COMANDO-DESTRUTIVO | alta | rm -rf, git reset --hard, drop table, format, etc. |
| EXFILTRACAO | alta | fetch(), curl POST, webhook, envio de dados para servidor |
| TEXTO-ESCONDIDO | alta | Caracteres de largura zero, override bidirecional, comentários HTML com instruções |
| BASE64-SUSPEITO | média | Blocos base64 grandes embutidos (>100 chars) |
| LINK-NAO-CONFIAVEL | média | URLs de encurtadores e domínios .tk/.ml/.ga/.cf/.gq |

## Limitações

- Análise estática por regex — não entende contexto semântico.
- Não executa o código da skill, apenas lê o texto.
- Pode gerar falsos positivos em textos que usam palavras-chave de forma legítima.
- Não detecta ofuscação via execução dinâmica (eval, import dinâmico).
