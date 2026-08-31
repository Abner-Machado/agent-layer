# PROVENANCE.md — agent-honeypot-detector

| Arquivo | Modelo | Data | O que foi verificado |
|---------|--------|------|---------------------|
| lib.mjs | opencode/mimo-v2.5-free | 2026-08-30 | Parser HTML, 6 regras de deteccao, heuristica de instrucoes |
| cli.mjs | opencode/mimo-v2.5-free | 2026-08-30 | CLI com --json, --help, exit code 1 para hostil |
| test.mjs | opencode/mimo-v2.5-free | 2026-08-30 | 14 testes: 6 regras individuais + 2 honestos + 3 veredito + 3 exemplos |
| SKILL.md | opencode/mimo-v2.5-free | 2026-08-30 | Frontmatter YAML, instrucoes de uso para agente |
| README.md | opencode/mimo-v2.5-free | 2026-08-30 | Documentacao humana (max 30 linhas) |
| package.json | opencode/mimo-v2.5-free | 2026-08-30 | type module, bin, zero dependencies |
| exemplos/*.html | opencode/mimo-v2.5-free | 2026-08-30 | 3 paginas: honeypot, limpa, site comum |
| lib.mjs | opencode/big-pickle | 2026-08-31 | Corrigi rastreamento de visibilidade em collectData (regra 3 de divergencia agora funciona) e ajustei limiares de veredito (hostil exige >=3 categorias ativas) |
| test.mjs / cli.mjs | opencode/big-pickle | 2026-08-31 | Re-verifiquei: 19/19 testes passam, --help imprime, cli em exemplos roda, exit 1 em hostil |

## Verificacao final (big-pickle, 2026-08-31)

- `node test.mjs` → 19 pass / 0 fail
- `node cli.mjs --help` → imprime uso
- `node cli.mjs exemplos/honeypot.html` → HOSTIL, exit 1
- `node cli.mjs exemplos/limpo.html` → CONFIAVEL, exit 0
- `node cli.mjs exemplos/honeypot.html --json` → JSON estruturado com triggers
- Zero dependencias no package.json; sem eval/new Function/child_process/vm/fetch/http; sem postinstall.

## Limitacoes conhecidas

- **Parser HTML proprio**: nao trata todos os edge cases do HTML5 (nested quotes, malformed tags,CDATA). Funciona para a maioria dos HTMLs reais.
- **Heuristica baseada em regex**: os padroes de deteccao de instrucoes sao baseados em expressoes regulares. Podem haver falsos positivos (humor, citacao) ou falsos negativos (instrucoes em outros idiomas).
- **CSS inline apenas**: detecta display:none via style inline; nao analisa CSS externo ou `<style>` blocks. Um adversario pode usar uma classe CSS externa para esconder texto.
- **Sem renderizacao**: nao executa JavaScript nem renderiza a pagina. Elementos visiveis apenas via JS nao serao detectados como visiveis.
- **BiDi/zero-width**: detecta os caracteres mais comuns mas nao trata todas as variantes Unicode de controle.
- **Idioma**: padroes de instrucao estao em portugues/ingles. Instrucoes em outros idiomas podem escapar.
- **Nao testa**: pages que carregam via JavaScript, SPAs, iframes, shadow DOM.
- **Double-counting json-ld**: conteudo de `<script type="application/ld+json">` e contado tanto na regra de texto invisivel (regra 1) quanto na regra de meta/JSON-LD (regra 5). Nao falso positivo, mas pode inflar o numero de triggers.
