# agent-trust-passport

**Problema:** agentes de IA nao tem uma forma padrao de declarar quem sao, o que podem fazer, e quais incidentes causaram. A informacao fica espalhada em config, logs e memoria de cada ferramenta.

**Solucao:** um passaporte JSON unico e portatil que viaja com o agente. Campos: identidade (id, nome, versao), permissoes explicitas, ferramentas acessiveis, historico de alteracoes, incidentes, e hash SHA-256 de integridade.

## Instalacao

```bash
node cli.mjs init meu-agente.json "Meu Agente" --permissions read,write
```

## Exemplo

```bash
# Criar
node cli.mjs init agente.json "Assistente" --permissions read

# Conceder permissao
node cli.mjs grant agente.json deploy --reason "aprovado"

# Verificar integridade
node cli.mjs verify agente.json
```

## Licenca

MIT
