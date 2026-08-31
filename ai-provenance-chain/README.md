# ai-provenance-chain

Quando um agente IA entrega resultado, ninguem consegue refazer o caminho
que levou ate ele. Falta ligar as pontas: qual documento entrou no contexto,
qual decisao foi tomada, qual ferramenta foi chamada e qual resultado saiu.

Esta skill cria uma cadeia de procedencia em quatro elos
(documento → contexto → decisao → ferramenta → resultado)
guardada em JSONL append-only.

## Instalacao

Copie a pasta para o projeto e rode com `node cli.mjs`.

## Uso

```bash
# Registrar elos
node cli.mjs link --file chain.jsonl --type documento --summary "Artigo" --id d1
node cli.mjs link --file chain.jsonl --type resultado --summary "Resultado" --id r1 --parent d1

# Ver cadeia
node cli.mjs chain --file chain.jsonl --id r1

# Achar resultados sem origem
node cli.mjs orphans --file chain.jsonl

# Estatisticas
node cli.mjs stats --file chain.jsonl
```

## Arquivos

- `lib.mjs` — logica pura (grafo, ciclos, caminhada)
- `cli.mjs` — interface de linha de comando
- `test.mjs` — testes com `node --test`

## Formato do id importado

Ao importar recibos com `--from-receipt`, os ids sao prefixados com o nome do
arquivo de origem (sem extensao) seguido de dois pontos. Isso evita colisao
quando dois arquivos de recibos tem ids numericos iguais (0, 1, 2...).

Exemplo: importar `recibos.jsonl` com `id: 0` gera o elo com id `recibos:0`.
Para caminhar essa cadeia: `node cli.mjs chain --file chain.jsonl --id recibos:0`.
