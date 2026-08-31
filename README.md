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

## Uso

Cada skill roda direto, sem instalar:

```
node skill-poison-detector/cli.mjs caminho/da/skill.md
node rag-expiration-engine/cli.mjs check --directory caminho/da/base
```

Cada pasta tem `--help`, exemplos reais e testes:

```
node --test skill-poison-detector/test.mjs
node --test rag-expiration-engine/test.mjs
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
