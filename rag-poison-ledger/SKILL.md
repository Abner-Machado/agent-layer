---
name: rag-poison-ledger
description: >-
  Use quando um agente responde errado por causa de um documento RAG duvidoso
  e voce precisa rastrear QUAL documento causou o erro e quais respostas ja
  foram contaminadas. Nao use para audit geral de logs ou para armazenar
  historico completo de conversas.
---

# rag-poison-ledger

Livro-razao append-only que liga documentos RAG a respostas de agentes.

## Problema

Quando um agente responde com base em documento incorreto na base RAG, nao
ha como saber: (1) qual documento causou o erro, (2) quais respostas
anteriores foram contaminadas pelo mesmo documento.

## Solucao

Um ledger JSONL com 4 comandos:

- **record** — registra uma resposta junto com os ids dos documentos que
  foram injetados no contexto dela
- **flag** — marca um documento como `poisoned` ou `incorrect`, informando
  quem marcou e por que
- **blast** — recebe o id de um documento marcado e devolve TODAS as
  respostas que usaram aquele documento, ordenadas da mais recente para
  a mais antiga
- **trace** — faz o caminho inverso: recebe o id de uma resposta e mostra
  todos os documentos que a alimentaram, com o status de cada um

## Uso

```bash
# Registrar uma resposta
node cli.mjs record ledger.jsonl resp-42 doc-a,doc-b --text "Resposta do agente"

# Marcar documento como envenenado
node cli.mjs flag ledger.jsonl doc-a poisoned alice --why "Contem dados desatualizados"

# Ver todas as respostas afetadas por doc-a
node cli.mjs blast ledger.jsonl doc-a

# Ver quais documentos alimentaram resp-42
node cli.mjs trace ledger.jsonl resp-42

# Consultar status de um documento
node cli.mjs status ledger.jsonl doc-a
```

## Armazenamento

Arquivo JSONL append-only. Linhas antigas nunca sao reescritas.
Correcoes entram como linhas novas (`type: correction`).
O status atual de um documento e derivado de flags + corrections.

## Dependencias

Nenhuma. Apenas Node.js 20+ (usa `node:fs`, `node:path`, `node:test`).
