# agent-layer

Ferramentas pequenas para a camada de agentes de IA. Cada pasta e uma skill
independente: um `SKILL.md` que o agente le e uma CLI que faz o trabalho de verdade.

## Por que existe

Agente de IA hoje instala skill de terceiro, injeta documento no contexto e executa
ferramenta sem que ninguem consiga auditar depois o que entrou e por que a acao
aconteceu. Estas ferramentas atacam esse buraco, uma parte de cada vez.

## Regra de seguranca do repositorio

Toda skill aqui obedece o mesmo contrato, e da para conferir lendo o codigo:

- **Zero dependencia externa.** So a biblioteca padrao do Node. Sem arvore de
  pacote, sem supply chain para envenenar, sem `npm install`.
- **Sem rede.** Nenhuma skill faz requisicao. Analise e sempre de arquivo local.
- **Sem execucao dinamica em codigo de producao.** `eval`, `new Function` e `vm` nao
  aparecem em lugar nenhum. `child_process` aparece apenas em arquivo de teste, para
  executar a propria CLI e conferir o codigo de saida.
- **Sem script de instalacao.** Nenhum `postinstall` no `package.json`.
- **Nenhum dado sai da maquina.** Sem telemetria.

## Requisito

Node 20 ou superior. Nada mais.

## Skills

| Skill | O que resolve |
|---|---|
| [`skill-poison-detector`](./skill-poison-detector) | Acha instrucao maliciosa ou escondida dentro de um `SKILL.md` antes de voce instalar: sequestro de regras, pedido de segredo, comando destrutivo, exfiltracao, texto invisivel, bidi override, base64 embutido, link suspeito. |
| [`rag-expiration-engine`](./rag-expiration-engine) | Da validade temporal a documento de base RAG. Fato vencido para de ser injetado no contexto em vez de virar resposta errada. |
| [`agent-receipt`](./agent-receipt) | Recibo encadeado por acao do agente. Cada recibo carrega o hash do anterior, entao editar ou apagar o historico depois deixa marca detectavel, apontando a linha exata. |
| [`agent-honeypot-detector`](./agent-honeypot-detector) | Analisa um HTML salvo em disco e diz se a pagina foi feita para manipular agente em vez de informar humano: instrucao em texto invisivel, comentario falando com o agente, divergencia entre texto visivel e texto lido, atributo carregando ordem, meta e JSON-LD imperativo, caractere invisivel. |
| [`agent-trust-passport`](./agent-trust-passport) | Passaporte portatil do agente num json unico: identidade, permissoes concedidas, historico de cada concessao e revogacao com motivo, incidentes, e hash de integridade que acusa edicao na mao. |
| [`rag-poison-ledger`](./rag-poison-ledger) | Livro razao append-only que liga documento a resposta. Quando um documento se revela errado, `blast` lista todas as respostas que ele contaminou e `trace` faz o caminho inverso, da resposta para os documentos que a alimentaram. |
| [`ai-provenance-chain`](./ai-provenance-chain) | Cadeia de procedencia em elos: documento, contexto, decisao, ferramenta, resultado. Dado um resultado, `chain` refaz o caminho ate a origem. Importa recibos do `agent-receipt` com `--from-receipt`. |

## Rodar em qualquer sistema

Funciona igual no **Windows**, **macOS** e **Linux**. O unico requisito e Node 20 ou superior.
Sem `npm install`, sem build, sem dependencia para baixar.

```
git clone https://github.com/Abner-Machado/agent-layer.git
cd agent-layer
node --version
```

Use sempre barra normal nos caminhos, inclusive no Windows: o Node aceita nos tres sistemas.

### As tres mais usadas

Antes de instalar uma skill de terceiro, ver se ela esconde instrucao maliciosa:

```
node skill-poison-detector/cli.mjs caminho/da/skill.md
```

Antes do agente confiar numa pagina que baixou, ver se ela foi feita para manipular agente:

```
node agent-honeypot-detector/cli.mjs pagina-salva.html
```

Deixar rastro do que o agente fez, e depois provar que o rastro nao foi mexido:

```
node agent-receipt/cli.mjs append recibos.jsonl --agent meu-bot --tool file_write --input "x" --policy "pode escrever" --status ok --cost 0.002
node agent-receipt/cli.mjs verify recibos.jsonl
```

Codigo de saida e contrato, entao serve em script e em CI:
`0` tudo certo, `1` achou problema, `2` erro de uso.

### As demais

```
node rag-expiration-engine/cli.mjs check --directory caminho/da/base
node rag-poison-ledger/cli.mjs blast livro.jsonl id-do-documento
node agent-trust-passport/cli.mjs verify passaporte.json
```

Toda skill responde a `--help` e traz exemplos reais na pasta `exemplos/`.

### Conferir o repositorio inteiro

```
node verificar.mjs
```

Descobre sozinho todas as skills, roda os testes de cada uma e imprime uma tabela.
Sai com `0` se tudo passou. Aceita `--json`.

Para rodar os testes de uma skill isolada, a partir da raiz:

```
node --test skill-poison-detector/test.mjs
```

## Licenca

MIT. Ver [LICENSE](./LICENSE).

## Creditos

Ideia e discussao do escopo: [@333MeioBesta](https://github.com/333MeioBesta) e
[@Abner-Machado](https://github.com/Abner-Machado).

O codigo de cada skill foi gerado com auxilio de modelo de linguagem local e
revisado, testado e auditado manualmente antes de entrar no repositorio. Cada
pasta traz um `PROVENANCE.md` dizendo qual modelo gerou cada arquivo, o que foi
verificado e quais as limitacoes conhecidas.
