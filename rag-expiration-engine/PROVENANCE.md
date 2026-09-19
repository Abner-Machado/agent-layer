# PROVENANCE.md — rag-expiration-engine

| Arquivo | Quem gerou | Data | O que foi verificado |
|---------|-----------|------|---------------------|
| lib.mjs | opencode/mimo-v2.5-free | 2026-08-30 | parseTTL, checkValidity, computeExpiration, getContentPolicy — testes unitarios passam |
| cli.mjs | opencode/mimo-v2.5-free | 2026-08-30 | stamp, check, filter — execucao real com arquivos de exemplo |
| test.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 12 testes incluindo fronteira expires_today e documento sem validade |
| SKILL.md | opencode/mimo-v2.5-free | 2026-08-30 | Frontmatter YAML valido, sem `: ` no campo description |
| README.md | opencode/mimo-v2.5-free | 2026-08-30 | Dentro de 30 linhas, problema antes da solucao |
| package.json | opencode/mimo-v2.5-free | 2026-08-30 | Zero dependencies, type module, license MIT |

## Limitacoes conhecidas

- **Nao suporta glob/expressao de arquivos** no filtro — o agente deve passar os caminhos explicitamente ou usar o indice completo
- **Indice e por diretorio** — cada pasta tem seu proprio `.rag-expiration-index.json`; nao ha indice global
- **TTL relativo usa meses de 30 dias** — nao ajusta para meses reais (31, 28, etc.)
- **Nao monitora mudancas no arquivo original** — se o conteudo muda, o agente deve re-`stamp`
- **Sem integracao com LLM** — e so a camada de metadados; o agente precisa chamar o CLI manualmente ou via hook

## Auditoria de 2026-09-19 (Abner-Machado)

Dois pontos em que a ferramenta falhava aberta, corrigidos a mao:

- `stamp doc.md 30dias` (erro de digitacao no TTL) gravava o documento com validade
  eterna e saia com 0. Agora sai com 1, imprime `Erro: TTL invalido` e nao toca no indice.
- `checkValidity` com `expiresAt` ilegivel no indice devolvia `valid: true, no_expiry`. Um
  byte trocado no indice virava validade eterna. Agora devolve `valid: false, invalid_expiry`;
  o `check` lista em bloco proprio e o `filter` deixa de fora.

Tres testes de CLI (caminho de falha, com `execFileSync`) e o teste unitario invertido.
18 testes viraram 21.
