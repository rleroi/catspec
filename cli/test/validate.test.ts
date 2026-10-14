import { describe, expect, it } from "vitest";
import { codes, count, CONFIG_YAML, validateProject } from "./helpers.js";

const FEATURE_HEAD = `---
feature: Things
using: [Supabase]
---

## Purpose

Fixture feature.
`;

const GOOD_REQ = `
## Requirements

### Requirement: Thing creation
WHEN a user creates a thing, the system MUST save it with status \`new\`.

#### Scenario: Create
- **WHEN** a user submits a thing
- **THEN** it is saved with status \`new\`
`;

describe("named requirements and scenarios", () => {
  it("accepts a clean feature file with zero issues", async () => {
    const r = await validateProject({ "bacon/things.md": FEATURE_HEAD + GOOD_REQ });
    expect(r.status).toBe("pass");
    expect(codes(r)).toEqual([]);
    expect(r.requirements).toEqual(["Things / Thing creation"]);
  });

  it("E_DUPLICATE_REQ: same requirement name twice in one file", async () => {
    const r = await validateProject({
      "bacon/things.md": FEATURE_HEAD + GOOD_REQ + GOOD_REQ.replace("## Requirements\n", ""),
    });
    expect(count(r, "E_DUPLICATE_REQ")).toBe(1);
    expect(r.status).toBe("fail");
  });

  it("E_REQ_NO_BODY: header followed directly by a scenario", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Empty one

#### Scenario: Something
- **WHEN** x
- **THEN** y
`,
    });
    expect(count(r, "E_REQ_NO_BODY")).toBe(1);
    expect(count(r, "W_REQ_NO_KEYWORD")).toBe(0);
  });

  it("E_SCENARIO_OUTSIDE_REQ: scenario heading with no requirement above it", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

#### Scenario: Orphan
- **WHEN** x
- **THEN** y
`,
    });
    expect(count(r, "E_SCENARIO_OUTSIDE_REQ")).toBe(1);
  });

  it("E_SCENARIO_NO_THEN: scenario without a THEN bullet", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Thing creation
The system MUST save things.

#### Scenario: No assertion
- **GIVEN** a user
- **WHEN** they submit a thing
`,
    });
    expect(count(r, "E_SCENARIO_NO_THEN")).toBe(1);
  });

  it("accepts plain (unbolded) step keywords", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Thing creation
The system MUST save things.

#### Scenario: Plain
- WHEN they submit a thing
- THEN it is saved
`,
    });
    expect(codes(r)).toEqual([]);
  });

  it("W_REQ_NO_KEYWORD: body without a BCP 14 keyword", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Soft wish
It would be nice if things were saved.

#### Scenario: Save
- **WHEN** x
- **THEN** y
`,
    });
    expect(count(r, "W_REQ_NO_KEYWORD")).toBe(1);
    expect(count(r, "W_REQ_NOT_EARS")).toBe(0);
  });

  it("W_REQ_NO_SCENARIO: warning normally, failure under --strict", async () => {
    const file = {
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Thing creation
The system MUST save things.
`,
    };
    const normal = await validateProject(file);
    expect(count(normal, "W_REQ_NO_SCENARIO")).toBe(1);
    expect(normal.status).toBe("pass");

    const strict = await validateProject(file, { strict: true });
    expect(strict.status).toBe("fail");
    expect(strict.strict).toBe(true);
  });

  it("W_REQ_NOT_EARS: keyword present but no template shape", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Odd shape
Saving things, which the system then MUST do quickly.

#### Scenario: Save
- **WHEN** x
- **THEN** y
`,
    });
    expect(count(r, "W_REQ_NOT_EARS")).toBe(1);
  });

  it("W_REQ_LONG: body over 500 characters", async () => {
    const longBody = "The system MUST " + "do a very long thing ".repeat(30) + ".";
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Long
${longBody}

#### Scenario: Save
- **WHEN** x
- **THEN** y
`,
    });
    expect(count(r, "W_REQ_LONG")).toBe(1);
  });

  it("recognises every EARS template including CONTINUE TO", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Requirements

### Requirement: Ubiquitous
Passwords MUST be at least 10 characters.
#### Scenario: a
- **THEN** ok

### Requirement: Event
WHEN a thing is saved, the system MUST notify the owner.
#### Scenario: b
- **THEN** ok

### Requirement: State
WHILE a thing is locked, the system MUST reject edits.
#### Scenario: c
- **THEN** ok

### Requirement: Unwanted
IF saving fails, THEN the system MUST keep the previous version.
#### Scenario: d
- **THEN** ok

### Requirement: Optional
WHERE billing is enabled, the system MUST show the invoice tab.
#### Scenario: e
- **THEN** ok

### Requirement: Regression
WHEN a thing is renamed, the system MUST CONTINUE TO keep its id.
#### Scenario: f
- **THEN** ok
`,
    });
    expect(count(r, "W_REQ_NOT_EARS")).toBe(0);
    expect(r.requirements).toHaveLength(6);
  });
});

describe("inline requirements and sections", () => {
  it("counts inline MUST sentences toward the sparse check and ignores lowercase", async () => {
    const sparse = await validateProject({
      "bacon/things.md": `---\nfeature: Things\n---\n\n## Purpose\n\nThings must exist.\n`,
    });
    expect(count(sparse, "W_SPARSE_FEATURE")).toBe(1);

    const inline = await validateProject({
      "bacon/things.md": `---\nfeature: Things\n---\n\n## Purpose\n\nThings MUST exist.\n`,
    });
    expect(count(inline, "W_SPARSE_FEATURE")).toBe(0);
  });

  it("W_NO_PURPOSE: spec file without a Purpose section", async () => {
    const r = await validateProject({
      "bacon/things.md": `---\nfeature: Things\nusing: [Supabase]\n---\n\nThings MUST exist.\n`,
    });
    expect(count(r, "W_NO_PURPOSE")).toBe(1);
  });

  it("ignores requirement-looking lines inside fenced blocks", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        "\n```sql\n-- ### Requirement: not real\ncreate policy p on t using (true); -- MUST not count\n```\n",
    });
    expect(r.requirements).toEqual([]);
    expect(count(r, "W_SPARSE_FEATURE")).toBe(0); // `using:` present, not sparse
  });

  it("keeps existing Model and Flow checks working next to requirements", async () => {
    const r = await validateProject({
      "bacon/things.md":
        FEATURE_HEAD +
        `
## Model: Thing

| Field | Type | Notes |
|---|---|---|
| name | text | |
| owner | Ghost | |

Invariants:
- The owner MUST exist.

## Flow: Empty
` +
        GOOD_REQ,
    });
    expect(count(r, "E_UNRESOLVED_REF")).toBe(1);
    expect(count(r, "W_NO_PRIMARY_KEY")).toBe(1);
    expect(count(r, "E_EMPTY_FLOW")).toBe(1);
    expect(r.requirements).toEqual(["Things / Thing creation"]);
  });
});

describe("references (SPEC.md §7.1)", () => {
  const FEATURE = (refs: string) =>
    `---\nfeature: Things\nreferences: [${refs}]\n---\n\n## Purpose\n\nThings.\n\nThings MUST exist.\n`;
  const CONFIG = (refs: string) => CONFIG_YAML + `references:\n${refs}`;

  it("E_UNKNOWN_REFERENCE: bound name not declared in config", async () => {
    const r = await validateProject({ "bacon/things.md": FEATURE("ghost") });
    expect(count(r, "E_UNKNOWN_REFERENCE")).toBe(1);
  });

  it("E_REFERENCE_KIND: missing uri or unknown kind", async () => {
    const r = await validateProject({
      "cat.config.yaml": CONFIG(`  a:\n    kind: figma\n    uri: x.json\n  b:\n    kind: doc\n`),
    });
    expect(count(r, "E_REFERENCE_KIND")).toBe(2);
  });

  it("W_REFERENCE_MISSING / W_REFERENCE_NO_SNAPSHOT and a clean local reference", async () => {
    const r = await validateProject({
      "cat.config.yaml": CONFIG(
        `  tokens:\n    kind: design-tokens\n    uri: bacon/refs/tokens.json\n` +
          `  gone:\n    kind: doc\n    uri: docs/none.md\n` +
          `  remote:\n    kind: design\n    uri: https://www.figma.com/design/x\n    via: mcp:figma\n` +
          `  snapped:\n    kind: api\n    uri: https://api.example.com/openapi.yaml\n    snapshot: bacon/refs/api/\n`,
      ),
      "bacon/refs/tokens.json": "{}",
      "bacon/things.md": FEATURE("tokens, snapped"),
    });
    expect(count(r, "W_REFERENCE_MISSING")).toBe(2); // gone uri, snapped snapshot
    expect(count(r, "W_REFERENCE_NO_SNAPSHOT")).toBe(1); // remote
    expect(count(r, "E_UNKNOWN_REFERENCE")).toBe(0);
    expect(r.errors).toHaveLength(0);
  });
});

describe("purr decisions", () => {
  it("W_DECISIONS_OPEN: purr with unresolved decisions", async () => {
    const r = await validateProject({
      purr: `last_transpiled_commit: abc\ndecisions:\n  - spec: bacon/system.md\n    requirement: X\n    kind: ambiguity\n    reason: r\n`,
    });
    expect(count(r, "W_DECISIONS_OPEN")).toBe(1);
    const clean = await validateProject({ purr: `last_transpiled_commit: abc\ndecisions: []\n` });
    expect(count(clean, "W_DECISIONS_OPEN")).toBe(0);
  });
});
