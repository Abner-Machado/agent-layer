# agent-receipt

## Problema

Quando um agente de IA executa uma acao — chama ferramenta, edita arquivo, gasta
credito — nao sobra prova do que aconteceu nem sob qual politica. Se algo der
errado, nao ha como rastrear nem verificar integridade.

## Solucao

Recibo encadeado por acao. Cada recibo tem hash SHA-256 da entrada, politica
aplicada, resultado e hash do recibo anterior, formando corrente verificavel
usando so node:crypto (zero dependencias).

## Instalacao

```bash
# Copie a pasta agent-receipt e rode diretamente
node cli.mjs --help
```

## Exemplo

```bash
node cli.mjs append receipts.jsonl --agent "Claude" --tool "file_edit" --input "teste" --policy "pode escrever"
node cli.mjs verify receipts.jsonl
node cli.mjs show receipts.jsonl
```
