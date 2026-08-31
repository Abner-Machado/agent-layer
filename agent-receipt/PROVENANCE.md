# PROVENANCE.md — agent-receipt

| Arquivo | Quem gerou | Data | O que foi verificado |
|---|---|---|---|
| lib.mjs | mimo-v2.5-free | 2026-08-30 | Funcoes puras: buildReceipt, sha256, verifyChain, summarize |
| cli.mjs | mimo-v2.5-free | 2026-08-30 | Comandos append, verify, show com parseArgs manual |
| test.mjs | mimo-v2.5-free | 2026-08-30 | 8 casos: adulteracao, remocao, corrente valida, vazio, prevHash, cost, ferramentas |
| SKILL.md | mimo-v2.5-free | 2026-08-30 | Frontmatter YAML valido, documentacao de uso |
| README.md | mimo-v2.5-free | 2026-08-30 | Problema, solucao, instalacao, exemplo |
| package.json | mimo-v2.5-free | 2026-08-30 | Zero dependencias, type module, MIT |

## Limitacoes conhecidas

- Recibos sao append-only; nao ha comando de remocao ou edicao
- Custo e custo declarado pelo agente, nao medido externamente
- Arquivo JSONL cresce indefinidamente; nao ha rotacao ou compressao
- Sem autenticacao de assinatura; integridade depende do hash sha256
- Timestamp e gerado localmente; nao ha relógio externo de referência
