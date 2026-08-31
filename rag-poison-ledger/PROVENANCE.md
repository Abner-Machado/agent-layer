# PROVENANCE.md — rag-poison-ledger

## Arquivos e rastreabilidade

| Arquivo | Gerado por | Data | Verificado |
|---|---|---|---|
| lib.mjs | opencode/mimo-v2.5-free | 2026-08-30 | Funcoes puras: createEntry, createFlag, createCorrection, docStatus, buildIndex, blast, trace, parseJsonl, toJsonl |
| cli.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 5 comandos (record, flag, blast, trace, status), --help, parsing de argumentos |
| test.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 14 testes cobrindo criacao, status, indice, blast, trace, documento sem resposta, flag apos uso, JSONL round-trip |
| SKILL.md | opencode/mimo-v2.5-free | 2026-08-30 | Frontmatter YAML valido, descricao sem `: ` fora de bloco |
| README.md | opencode/mimo-v2.5-free | 2026-08-30 | Explica problema antes da solucao, 30 linhas |
| package.json | opencode/mimo-v2.5-free | 2026-08-30 | Sem dependencies, type module, license MIT |
| exemplos/exemplo.jsonl | opencode/mimo-v2.5-free | 2026-08-30 | Ledger de exemplo com 2 respostas, 1 flag, 1 correction |

## Limitacoes conhecidas

- Nao e um servidor. Nao ouve conexoes — so le/grava arquivo local.
- Nao resolve colisoes de id. Se dois registros usam o mesmo id, ambos ficam
  no ledger eblast/trace retornam ambos.
- Nao valida se o documento existe fisicamente. So rastreia ids.
- Nao faz backup nem criptografia do ledger.
- Indice e derivado a cada leitura (nao mantido em memoria entre chamadas).
  Para ledgers muito grandes (>100k linhas), considerar indice separado.
