// rag-poison-ledger — tests for lib.mjs and cli.mjs
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEntry,
  createFlag,
  createCorrection,
  docStatus,
  buildIndex,
  blast,
  trace,
  parseJsonl,
  toJsonl,
} from "./lib.mjs";

describe("createEntry", () => {
  it("creates an entry with required fields", () => {
    const e = createEntry("resp-1", ["doc-a", "doc-b"], "hello");
    assert.equal(e.t, "e");
    assert.equal(e.id, "resp-1");
    assert.deepEqual(e.docs, ["doc-a", "doc-b"]);
    assert.equal(e.text, "hello");
    assert.ok(e.ts > 0);
  });

  it("throws on missing id", () => {
    assert.throws(() => createEntry("", ["doc-a"]), /id is required/);
  });

  it("throws on non-array docIds", () => {
    assert.throws(() => createEntry("r1", "doc-a"), /docIds must be an array/);
  });
});

describe("createFlag", () => {
  it("creates a flag with valid status", () => {
    const f = createFlag("doc-a", "poisoned", "alice", "wrong data");
    assert.equal(f.t, "f");
    assert.equal(f.docId, "doc-a");
    assert.equal(f.status, "poisoned");
    assert.equal(f.by, "alice");
    assert.equal(f.why, "wrong data");
  });

  it("throws on invalid status", () => {
    assert.throws(
      () => createFlag("doc-a", "clean", "alice"),
      /status must be poisoned or incorrect/
    );
  });
});

describe("createCorrection", () => {
  it("creates a correction with clean status", () => {
    const c = createCorrection("doc-a", "clean", "bob", "verified ok");
    assert.equal(c.t, "c");
    assert.equal(c.status, "clean");
  });

  it("throws on invalid status", () => {
    assert.throws(
      () => createCorrection("doc-a", "unknown", "bob"),
      /status must be poisoned, incorrect, or clean/
    );
  });
});

describe("docStatus", () => {
  it("returns null for unknown document", () => {
    const s = docStatus("doc-unknown", []);
    assert.equal(s.status, null);
  });

  it("returns poisoned from flag", () => {
    const flag = createFlag("doc-x", "poisoned", "alice", "bad");
    const s = docStatus("doc-x", [flag]);
    assert.equal(s.status, "poisoned");
    assert.equal(s.by, "alice");
  });

  it("returns clean after correction overrides flag", () => {
    const flag = createFlag("doc-x", "poisoned", "alice", "bad");
    const corr = createCorrection("doc-x", "clean", "bob", "fixed");
    const s = docStatus("doc-x", [flag, corr]);
    assert.equal(s.status, "clean");
    assert.equal(s.by, "bob");
  });
});

describe("buildIndex", () => {
  it("builds inverted index from entries", () => {
    const e1 = createEntry("r1", ["d1", "d2"]);
    const e2 = createEntry("r2", ["d2", "d3"]);
    const idx = buildIndex([e1, e2]);
    assert.deepEqual(idx.get("d1"), ["r1"]);
    assert.deepEqual(idx.get("d2"), ["r1", "r2"]);
    assert.deepEqual(idx.get("d3"), ["r2"]);
  });

  it("ignores flag lines", () => {
    const e = createEntry("r1", ["d1"]);
    const f = createFlag("d1", "poisoned", "x", "reason");
    const idx = buildIndex([e, f]);
    assert.deepEqual(idx.get("d1"), ["r1"]);
  });
});

describe("blast", () => {
  it("finds responses using a document, newest first", () => {
    const e1 = createEntry("r1", ["d1"], "first");
    e1.ts = 1000;
    const e2 = createEntry("r2", ["d1", "d2"], "second");
    e2.ts = 2000;
    const lines = [e1, e2];
    const results = blast("d1", lines);
    assert.equal(results.length, 2);
    assert.equal(results[0].id, "r2");
    assert.equal(results[1].id, "r1");
  });

  it("annotates doc status when flagged", () => {
    const e = createEntry("r1", ["d1"]);
    const f = createFlag("d1", "poisoned", "alice", "bad");
    const results = blast("d1", [e, f]);
    assert.equal(results[0].docStatus.status, "poisoned");
  });

  it("returns empty array for unknown document", () => {
    const results = blast("nonexistent", []);
    assert.equal(results.length, 0);
  });
});

describe("trace", () => {
  it("returns entry with all documents and their statuses", () => {
    const e = createEntry("r1", ["d1", "d2"], "answer text");
    const f = createFlag("d1", "incorrect", "bob", "outdated");
    const result = trace("r1", [e, f]);
    assert.equal(result.entry.id, "r1");
    assert.equal(result.documents.length, 2);
    assert.equal(result.documents[0].status, "incorrect");
    assert.equal(result.documents[1].status, null);
  });

  it("returns null entry for unknown response", () => {
    const result = trace("nonexistent", []);
    assert.equal(result.entry, null);
    assert.deepEqual(result.documents, []);
  });
});

describe("response without any documents", () => {
  it("blast returns empty, trace returns empty docs", () => {
    const e = createEntry("r-no-docs", [], "no context used");
    const lines = [e];
    const b = blast("any-doc", lines);
    assert.equal(b.length, 0);
    const t = trace("r-no-docs", lines);
    assert.equal(t.entry.id, "r-no-docs");
    assert.equal(t.documents.length, 0);
  });
});

describe("document flagged after already used", () => {
  it("blast shows entry with poisoned status even though flag came later", () => {
    const e = createEntry("r1", ["d1"], "used before flag");
    const f = createFlag("d1", "poisoned", "alice", "caught later");
    const lines = [e, f];
    const results = blast("d1", lines);
    assert.equal(results.length, 1);
    assert.equal(results[0].docStatus.status, "poisoned");
    assert.equal(results[0].text, "used before flag");
  });

  it("trace shows poisoned status for the document", () => {
    const e = createEntry("r1", ["d1"]);
    const f = createFlag("d1", "poisoned", "alice", "caught later");
    const t = trace("r1", [e, f]);
    assert.equal(t.documents[0].status, "poisoned");
  });
});

describe("parseJsonl and toJsonl", () => {
  it("round-trips an object", () => {
    const obj = { t: "e", id: "r1", docs: ["d1"] };
    const line = toJsonl(obj);
    const parsed = parseJsonl(line);
    assert.equal(parsed.length, 1);
    assert.deepEqual(parsed[0], obj);
  });

  it("skips invalid lines", () => {
    const raw = '{"t":"e"}\nnot json\n{"t":"f"}\n';
    const parsed = parseJsonl(raw);
    assert.equal(parsed.length, 2);
  });
});

describe("document used in multiple responses", () => {
  it("blast returns all responses that used the same document", () => {
    const e1 = createEntry("r1", ["d1", "d2"]);
    const e2 = createEntry("r2", ["d1"]);
    const e3 = createEntry("r3", ["d2", "d3"]);
    const f = createFlag("d1", "incorrect", "carol", "stale info");
    const lines = [e1, e2, e3, f];
    const results = blast("d1", lines);
    assert.equal(results.length, 2);
    assert.equal(results[0].docStatus.status, "incorrect");
  });
});

const CLI = join(import.meta.dirname, "cli.mjs");

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      encoding: "utf8",
      timeout: 5000,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
  }
}

function tmpLedger(name) {
  return join(tmpdir(), `test-ledger-${name}-${Date.now()}.jsonl`);
}

describe("cli.mjs — validacao de argumentos", () => {
  it("recusa response-id comecando com hifen", () => {
    const ledger = tmpLedger("hyphen-resp");
    const result = runCli(["record", ledger, "--answer", "r1", "--docs", "d1,d2"]);
    assert.notEqual(result.code, 0, "deveria falhar com exit code != 0");
    assert.ok(result.stderr.includes("hifen"), `stderr deve mencionar hifen: ${result.stderr}`);
    if (existsSync(ledger)) {
      const content = readFileSync(ledger, "utf8");
      assert.equal(content, "", "ledger deveria estar vazio");
    }
  });

  it("recusa doc-id comecando com hifen", () => {
    const ledger = tmpLedger("hyphen-doc");
    const result = runCli(["record", ledger, "resp-1", "--docs"]);
    assert.notEqual(result.code, 0, "deveria falhar com exit code != 0");
    assert.ok(result.stderr.includes("hifen"), `stderr deve mencionar hifen: ${result.stderr}`);
  });

  it("recusa lista de documentos vazia", () => {
    const ledger = tmpLedger("empty-docs");
    const result = runCli(["record", ledger, "resp-1", ""]);
    assert.notEqual(result.code, 0, "deveria falhar com exit code != 0");
    assert.ok(result.stderr.includes("vazia"), `stderr deve mencionar vazia: ${result.stderr}`);
  });

  it("recusa flag com doc-id comecando com hifen", () => {
    const ledger = tmpLedger("flag-hyphen");
    const result = runCli(["flag", ledger, "--bad", "poisoned", "alice"]);
    assert.notEqual(result.code, 0, "deveria falhar com exit code != 0");
    assert.ok(result.stderr.includes("hifen"), `stderr deve mencionar hifen: ${result.stderr}`);
  });

  it("recusa argumentos faltando em todos os comandos", () => {
    const ledger = tmpLedger("missing-args");
    const record = runCli(["record", ledger]);
    assert.notEqual(record.code, 0);

    const flag = runCli(["flag", ledger]);
    assert.notEqual(flag.code, 0);

    const blast = runCli(["blast", ledger]);
    assert.notEqual(blast.code, 0);

    const trace = runCli(["trace", ledger]);
    assert.notEqual(trace.code, 0);

    const status = runCli(["status", ledger]);
    assert.notEqual(status.code, 0);
  });

  it("recusa response-id comecando com hifen no trace", () => {
    const ledger = tmpLedger("trace-hyphen");
    const result = runCli(["trace", ledger, "--bad-id"]);
    assert.notEqual(result.code, 0, "deveria falhar com exit code != 0");
    assert.ok(result.stderr.includes("hifen"), `stderr deve mencionar hifen: ${result.stderr}`);
  });
});
