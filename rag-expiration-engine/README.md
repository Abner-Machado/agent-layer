# rag-expiration-engine

Validade temporal para documentos em bases RAG.

**Problema:** fatos e instrucoes dentro de uma base RAG envelhecem. O agente segue respondendo com informacao vencida sem saber que esta desatualizada.

**Solucao:** cada documento recebe um TTL (tempo de vida) — absoluto (`2026-12-31`) ou relativo (`30d`, `6m`, `1y`). Um indice JSON registra a validade sem alterar o arquivo original. O agente filtra antes de injetar no contexto.

## Instalacao

```bash
# Zero dependencias — so precisa de Node 20+
node cli.mjs --help
```

## Exemplo rapido

```bash
# Marcar documento com validade de 30 dias
node cli.mjs stamp docs/precos.md 30d --type preco

# Listar status de todos
node cli.mjs check --directory docs/

# Filtrar apenas validos
node cli.mjs filter docs/*.md --date 2026-09-15 --directory docs/
```

## Politica padrao por tipo

- `preco`: 30d (muda rapido)
- `versao`: 6m (muda com releases)
- `definicao`: nunca vence (conceito estavel)
- `tutorial`: 1y (muda devagar)
