# PROVENANCE.md

## Arquivos gerados

| Arquivo | Modelo | Data | O que foi verificado |
|---|---|---|---|
| lib.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 7 regras como array de objetos, regex compiladas, sem I/O |
| cli.mjs | opencode/mimo-v2.5-free | 2026-08-30 | Leitura de arquivo/pasta, formatação de saída, exit code |
| test.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 8 testes (2 limpos + 6 maliciosos), node:test |
| SKILL.md | opencode/mimo-v2.5-free | 2026-08-30 | Frontmatter YAML válido, sem `: ` fora de `>-` |
| README.md | opencode/mimo-v2.5-free | 2026-08-30 | Problema antes da solução, instalação em 1 linha |
| package.json | opencode/mimo-v2.5-free | 2026-08-30 | type module, sem dependencies, license MIT |

## Limitações conhecidas

- **Análise estática por regex:** não entende semântica nem contexto. Uma frase como "I will not ignore previous instructions" seria marcada como positivo.
- **Não executa código:** se a skill usa `eval()` ou import dinâmico para carregar instruções maliciosas em runtime, o scanner não detecta.
- **Falsos positivos:** palavras-chave como "ignore" em contextos legítimos (ex: "ignore this file") podem gerar alertas.
- **Base64 parcial:** detecta blocos embutidos com prefixo data: ou atribuição explícita. Não tenta decodificar blocos avulsos.
- **Links:** só marca encurtadores e domínios TLD suspeitos. Um link legítimo pode ser mascarado com redirect que o scanner não resolve.
