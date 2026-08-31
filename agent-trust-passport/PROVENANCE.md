# PROVENANCE.md — agent-trust-passport

| Arquivo | Modelo | Data | O que foi verificado |
|---|---|---|---|
| lib.mjs | mimo-v2.5-free | 2026-08-30 | Funcoes puras: criacao, grant, revoke, incident, hash, validate |
| cli.mjs | mimo-v2.5-free | 2026-08-30 | 4 comandos (init/grant/revoke/incident/verify) + --help |
| test.mjs | mimo-v2.5-free | 2026-08-30 | 10 casos: criacao, grant, revoke, incident, hash, integridade, adulteracao, schema |
| SKILL.md | mimo-v2.5-free | 2026-08-30 | Frontmatter YAML valido, uso descrito |
| README.md | mimo-v2.5-free | 2026-08-30 | Problema, solucao, instalacao, exemplo |
| package.json | mimo-v2.5-free | 2026-08-30 | Zero dependencias, type module, bin, MIT |
| exemplos/ | mimo-v2.5-free | 2026-08-30 | Entrada e saida real gerada pelo CLI |

## Limitacoes conhecidas

- Nao faz autenticacao real do agente — so valida integridade do documento.
- Nao persiste historico de quem executou cada grant/revoke (so registra a acao).
- Nao suporta permissoes hierarquicas ou heranca.
- Nao valida se as ferramentas listadas realmente existem no ambiente.
- O hash protege contra adulteracao local, mas nao contra replay de versao antiga.
