# rag-poison-ledger

Append-only ledger that links RAG documents to agent responses for poison tracking.

## Problem

When an agent gives a wrong answer because of a bad document in the RAG base,
there is no way to know which document caused it or which previous answers were
already contaminated by the same document.

## Solution

A JSONL ledger with 4 commands: `record`, `flag`, `blast`, `trace`.
Documents are linked to responses; flags mark poisoned docs; blast/trace show
the blast radius.

## Install

```bash
# Copy the folder to your project, then:
node cli.mjs --help
```

## Example

```bash
node cli.mjs record ledger.jsonl resp-1 doc-a,doc-b
node cli.mjs flag ledger.jsonl doc-a poisoned alice --why "Wrong data"
node cli.mjs blast ledger.jsonl doc-a
node cli.mjs trace ledger.jsonl resp-1
```

## License

MIT
