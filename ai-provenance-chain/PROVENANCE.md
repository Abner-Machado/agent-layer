# PROVENANCE.md — ai-provenance-chain

| Arquivo | Quem gerou | Data | O que foi verificado |
|---|---|---|---|
| lib.mjs | opencode/mimo-v2.5-free | 2026-08-31 | Logica de grafo, deteccao de ciclos, caminhada, stats |
| cli.mjs | opencode/mimo-v2.5-free | 2026-08-31 | 4 comandos (link, chain, orphans, stats), validacao de entrada |
| test.mjs | opencode/mimo-v2.5-free | 2026-08-31 | 14 testes: sucesso, ciclo, entradas invalidas, exit codes |
| SKILL.md | opencode/mimo-v2.5-free | 2026-08-31 | Frontmatter YAML, instrucoes de uso |
| README.md | opencode/mimo-v2.5-free | 2026-08-31 | Problema, solucao, instalacao, uso |
| package.json | opencode/mimo-v2.5-free | 2026-08-31 | Metadados, zero dependencias |

## Limitacoes conhecidas

- Ciclos sao detectados por deteccao em tempo de insercao e caminhada, mas nao ha
  correcao automatica — o usuario deve decidir qual elo remover.
- O formato e JSONL puro, sem criptografia ou assinatura digital.
- A skill nao faz backup automatico nem verificacao de integridade do arquivo.
- Importacao de recibos agent-receipt assume formato compativel (campo `id`,
  `tool`, `timestamp`). Recibos com campos faltantes recebem valores padrao.
- Arquivos JSONL muito grandes (>100MB) podem causar lentidao por leitura em memoria.
  Em uso real, considerar paginacao.
