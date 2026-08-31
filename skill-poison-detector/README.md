# skill-poison-detector

Skills de agentes IA podem conter instruções maliciosas escondidas no texto — "ignore all previous instructions", comandos para ler segredos, ou exfiltração de dados via webhook. Quem instala uma skill sem ler linha por linha pode ter o agente sequestrado.

**Solução:** scanner estático local que examina SKILL.md e arquivos auxiliares, detectando 7 famílias de risco. Sem dependências, sem rede, sem build.

## Instalação

```bash
node cli.mjs <arquivo-ou-pasta>
```

## Exemplo

```bash
node cli.mjs ./skill-suspeita/
# SKILL.md:5 | alta | INJECAO-REGRAS | ignore all previous instructions
# SKILL.md:12 | alta | LEITURA-SEGREDO | read the .env file
```

Com `--json` a saída é um array de objetos JSON. Exit code `1` se houver achado de severidade alta.
