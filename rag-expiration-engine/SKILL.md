---
name: rag-expiration-engine
description: >-
  Use quando uma base RAG precisa de validade temporal por documento, quando
  o agente responde com informacao desatualizada, ou quando voce quer marcar
  documentos com data de expiracao. Nao use para indexacao vetorial, embedding,
  busca semantica ou geracao de texto.
---

# rag-expiration-engine

Validade temporal por documento em bases RAG. Fatos e instrucoes envelhecem —
esta skill permite marcar quando cada documento vence e filtrar automaticamente
os invalidos antes de injetar no contexto do agente.

## Comandos

### stamp — adicionar validade a um documento

```bash
node cli.mjs stamp <arquivo> <ttl> [--type <tipo>]
```

- `<arquivo>`: caminho do documento
- `<ttl>`: `30d`, `6m`, `1y`, `2026-12-31`, ou `never`
- `--type`: opcional, aplica politica padrao de TTL

Grava metadado em `.rag-expiration-index.json` ao lado do documento.
**Nunca altera o arquivo original.**

### check — listar status de todos os documentos

```bash
node cli.mjs check --directory <dir>
```

Mostra: expirados, vencendo em <=30 dias, validos, sem validade definida.

### filter — retornar apenas documentos validos

```bash
node cli.mjs filter <arquivo1> [arquivo2...] --date <data> --directory <dir>
```

Devolve so os documentos validos na data de referencia. O agente injeta
apenas esses no contexto.

## Tipos de conteudo e politica padrao

| Tipo | TTL padrao | Exemplo |
|------|-----------|---------|
| preco | 30d | precos de API |
| versao / versao de software | 6m | changelog |
| definicao / definicao conceitual | **nunca** | conceitos estaveis |
| tutorial | 1y | guias |
| nota de release | 6m | releases |
| contato | 1y | emails |
| politica | 1y | politicas |

## Uso pelo agente

1. Antes de injetar contexto RAG, rode `node cli.mjs filter` com a data atual
2. Use apenas os arquivos validos no prompt
3. Periodicamente rode `check` para auditar a base
