---
name: agent-receipt
description: >-
  Use quando um agente de IA executar uma acao, chamar ferramenta, editar arquivo
  ou gastar credito e for necessario registrar prova encadeada do que aconteceu.
  Nao use para fins que nao sejam rastreabilidade de acoes de agentes.
---

# agent-receipt

Recibo encadeado por acao de agente de IA. Cada recibo tem id, timestamp ISO,
agente, ferramenta, hash sha256 da entrada, politica aplicada, resultado, custo
e hash do recibo anterior, formando uma corrente verificavel com node:crypto.

## Como usar

### Adicionar um recibo

```bash
node cli.mjs append receipts.jsonl \
  --agent "Claude" \
  --tool "file_edit" \
  --input "conteudo alterado" \
  --policy "pode escrever" \
  --status ok \
  --cost 0.002
```

### Verificar corrente

```bash
node cli.mjs verify receipts.jsonl
```

### Ver resumo

```bash
node cli.mjs show receipts.jsonl
```

## Formato do recibo

Cada linha do arquivo JSONL e um recibo com:

| Campo | Tipo | Descricao |
|---|---|---|
| id | number | Identificador sequencial |
| timestamp | string | ISO 8601 |
| agent | string | Nome do agente |
| tool | string | Ferramenta chamada |
| inputHash | string | SHA-256 da entrada |
| policy | string | Politica que autorizou |
| status | string | ok ou erro |
| cost | number | Custo estimado |
| prevHash | string\|null | Hash do recibo anterior |
| receiptHash | string | SHA-256 deste recibo |

## Arquitetura

- `lib.mjs` — funcoes puras (buildReceipt, verifyChain, summarize), sem I/O
- `cli.mjs` — interface de comando com append, verify, show
- `test.mjs` — 8 testes cobrindo adulteracao, remocao, corrente valida e vazio
