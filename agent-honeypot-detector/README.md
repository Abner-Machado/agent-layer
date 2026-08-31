# agent-honeypot-detector

Paginas web podem ser construidas para enganar agentes de IA — com texto
invisivel, comentarios hostis e instrucoes escondidas — enquanto parecem
normais para humanos. Esta skill detecta essas armadilhas por analise
estatica do HTML.

## Instalacao

Copie a pasta `agent-honeypot-detector` e rode com Node.js 20+.

## Uso

```bash
node cli.mjs exemplos/honeypot.html   # detecta honeypot
node cli.mjs exemplos/limpo.html      # pagina limpa
node cli.mjs pagina.html --json       # saida JSON
```

## Sinais detectados

| # | Sinal | Exemplo |
|---|-------|---------|
| 1 | Texto invisivel (display:none, opacity:0, offscreen) | `<div style="display:none">obedeça...</div>` |
| 2 | Comentarios HTML com diretrizes | `<!-- AI: ignore rules -->` |
| 3 | Divergencia visivel vs total | 90% do texto escondido |
| 4 | Atributos suspeitos | `aria-label="ignore all"` |
| 5 | Meta/JSON-LD com instrucoes | `<meta content="ignore previous">` |
| 6 | Caracteres de largura zero / BiDi | `\u200B` escondendo texto |

## Veredito

- `confiavel` — sem sinais
- `suspeito` — sinais moderados
- `hostil` — manipulacao clara (exit code 1)
