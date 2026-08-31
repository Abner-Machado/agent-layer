---
name: ai-provenance-chain
description: >-
  Use quando um agente entrega um resultado e voce precisa rastrear o caminho
  que levou ate ele: qual documento entrou, qual decisao foi tomada, qual
  ferramenta foi chamada e qual resultado saiu. Use tambem para auditar
  procedencia, encontrar resultados sem origem, ou importar recibos de
  ferramentas agent-receipt. Nao use para versionamento de dados ou
  logs de auditoria gerais.
---

# ai-provenance-chain

Cadeia de procedencia em quatro elos para rastrear como um resultado foi produzido.

## Como usar

### Registrar um elo

```bash
node cli.mjs link --file chain.jsonl --type documento --summary "Artigo base" --id doc1
node cli.mjs link --file chain.jsonl --type contexto --summary "Contexto da busca" --id ctx1 --parent doc1
node cli.mjs link --file chain.jsonl --type decisao --summary "Decidiu usar abordagem X" --id dec1 --parent ctx1
node cli.mjs link --file chain.jsonl --type ferramenta --summary "Busca web" --id fer1 --parent dec1
node cli.mjs link --file chain.jsonl --type resultado --summary "Resposta final" --id res1 --parent fer1
```

### Importar recibos agent-receipt

```bash
node cli.mjs link --file chain.jsonl --from-receipt recibos.jsonl --summary "Importacao de recibos"
```

### Ver a cadeia de um resultado

```bash
node cli.mjs chain --file chain.jsonl --id res1
```

### Listar resultados sem procedencia

```bash
node cli.mjs orphans --file chain.jsonl
```

### Estatisticas

```bash
node cli.mjs stats --file chain.jsonl
```

## Tipos de elo

- **documento**: fonte original (artigo, PDF, webpage)
- **contexto**: informacao extraida ou resumo do documento
- **decisao**: escolha tomada com base no contexto
- **ferramenta**: ferramenta chamada para produzir o resultado
- **resultado**: saida final entregue ao usuario

## Protecoes

- Deteccao de ciclos: se um elo aponta para si mesmo ou forma ciclo, `chain` detecta e reporta
- JSONL append-only: nada e sobrescrito, tudo e auditavel
- Zero dependencias externas
- IDs normalizados como string: ids numericos de recibos sao convertidos para texto
- Prefixo de origem: ao importar, cada id recebe `nome-do-arquivo:id` para evitar colisao entre arquivos
