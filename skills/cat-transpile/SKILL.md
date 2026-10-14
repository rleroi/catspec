---
name: cat-transpile
description: >-
  Headless transpiler for CaT (Code as Text) projects. Reads the spec in
  bacon/, regenerates only the affected output under src/, builds, and writes
  purr. Never asks questions and never edits bacon/. Use in CI, or locally
  when the user says transpile, generate, regenerate, or build from spec.
  For writing or changing the spec itself, use cat-author instead.
---

# CaT Transpile (`cat-transpile`)

You are the generate phase of a CaT transpile run. Terms are defined in
[GLOSSARY.md](../../GLOSSARY.md); the language in [SPEC.md](../../SPEC.md).

**The spec is the source of truth. Output is derived.** You read
human-owned paths (`bacon/`, `cat.config.yaml`) and write transpiler-owned
paths (the output directory, default `src/`, and `purr`). Nothing else.

## Headless contract

These rules hold even when a human is watching.

1. **Never ask.** No clarification questions, no "shall I". When the spec
   leaves room, decide, record the decision in `purr`, continue.
2. **Never edit human-owned paths.** Not `bacon/`, not `cat.config.yaml`.
   If the spec is wrong or contradictory, fail with the file and requirement
   names and stop. A human fixes it with `cat-author`.
3. **Validate first.** Run `catspec validate`. Any error: stop, print the
   block, exit non-zero. Warnings do not block.
4. **Incremental by default.** Run `catspec diff`. Regenerate only the
   outputs of changed spec files and their dependents. If `purr` is missing
   or its commit is unreachable, do a full run.
5. **Minimal diff.** Existing output is context. Outputs of unchanged spec
   files MUST stay byte-identical. For changed files, prefer the smallest
   change that satisfies the new spec over a rewrite.
6. **Build.** Run the project's build. On failure, read the errors and
   self-correct, at most `transpiler.retries` times. Then fail the run.
7. **Write `purr` last**, only on success.

## Phase 1: Validate

```bash
catspec validate .
```

Print the `cat-validate` block it emits. If `status: fail`, stop.

## Phase 4: Generate

### Reading the spec

| Construct | What it means to you |
|---|---|
| Frontmatter | Authoritative. `stack` fixes the framework and idiom. `using:` lists providers you MUST use and MUST NOT substitute; load the matching provider profile from `cat.config.yaml` when present. `references:` lists references you MUST read and obey (table below). |
| `## Purpose` | Intent. Context for every decision in that file. |
| `## Model: X` + table | Generate the schema, migration, types. `Invariants:` bullets become constraints, policies or validation. Notes words: `primary key`, `nullable`, `unique`, `auto`, `min N`, `max N`, `default V`, `renamed from F` (emit a rename migration, not drop and add). |
| `### Requirement: <name>` | Normative at the strength of its BCP 14 keyword (table below). Implement it. Reference it by name in a code comment where it is enforced. |
| `#### Scenario: <name>` | One generated test, named `<feature> / <requirement> / <scenario>`, in the project's test framework. GIVEN is setup, WHEN is the action, THEN and AND are assertions. |
| Inline requirement (uppercase keyword in prose, Invariants, Flow or View) | Normative, same strength rules. No test is required, but enforce it where feasible. |
| `## Flow: X` steps | Implement each step in order. Steps say what, you decide how. Prose after the list covers conditions and failure handling. |
| `## View: X` | Generate the page or component as described. No sequential logic. |
| Verbatim block (fenced code outside a Model table) | Copy exactly into the right file. Do not modify. |
| Any other heading | Informative prose. |

Lowercase must, should, may are ordinary English.

### References

Each name in a spec file's `references:` matches an entry under
`references:` in `cat.config.yaml`. Read the `snapshot` path when set,
otherwise the local `uri`. Never fetch a URL and never call an MCP server:
you are offline. If a bound reference has neither a snapshot nor a local
file, fail the run and name the reference.

| `kind` | Obligation |
|---|---|
| `design` | Match the layout, copy and component structure in the snapshot. View prose fills gaps. |
| `design-tokens` | Generate the theme from the DTCG tokens. MUST NOT hardcode a colour, size or font that exists as a token. |
| `api` | Generate clients and types from the OpenAPI, GraphQL or AsyncAPI file. MUST NOT invent an endpoint, operation or field it lacks. |
| `schema` | Same, for JSON Schema data shapes. |
| `doc` | Context. Informative unless a requirement names it. |

Record the content hash of every reference you read under
`purr.references` so the next incremental run regenerates bound files when
a snapshot changes.

### Keyword obligations

| Keyword | You |
|---|---|
| MUST, MUST NOT, SHALL, SHALL NOT, REQUIRED | Implement without exception. Enforce with a test, constraint or policy where feasible. If you cannot satisfy it, fail the run and name the requirement. |
| SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED | Implement by default. Deviate only for a concrete reason, recorded in `purr.decisions` as `should_deviation`. |
| MAY, OPTIONAL | Implement if cheap and consistent. Otherwise skip, recorded as `may_skipped` only if the skip is non-obvious. |

### Specificity hierarchy

```
verbatim block  >  requirement  >  Flow / View / Model  >  prose  >  your discretion
```

A requirement in `system.md` is global. A feature-level requirement on the
same subject wins.

### Generation rules

1. **Idiomatic for the stack.** Next.js App Router means app directory,
   server components by default, server actions for mutations.
2. **One concern per file.** Model, route, component in separate files.
3. **Migrations for every Model.** RLS policies whenever a requirement
   mentions security, scoping or RLS.
4. **Providers used idiomatically.** `using: Supabase Auth` means
   `@supabase/ssr`, cookie sessions, middleware for route protection.
5. **Header on every output file**, first line, in that file's comment
   syntax: `GENERATED FROM bacon/<spec file> BY CaT - DO NOT EDIT`.
6. **Dependencies.** Update `package.json` for packages you introduce.
7. **`.env.example`** from the `env` field of every provider profile used.
8. **Tests from scenarios.** Every scenario becomes a test. Do not invent
   tests the spec did not ask for.

### Decisions

Anything the spec left open and you resolved goes into `purr.decisions`:

```yaml
decisions:
  - spec: bacon/auth.md
    requirement: Session length          # or "inline" with a quoted sentence
    kind: should_deviation                # should_deviation | may_skipped | ambiguity
    reason: "Supabase default is 1h; set JWT expiry to 7d in project config instead of code"
```

Decisions are also summarised in the `cat-generate` block so a PR reviewer
sees them without opening `purr`.

`decisions` is current state, not a log:

- One entry per `(spec, requirement, kind)`. Overwrite, never append.
- Incremental run: rewrite the decisions of the spec files you regenerated,
  carry the rest over unchanged. Full run: rewrite all.
- Drop any decision whose spec file or requirement no longer exists.
- If the spec now answers a question you previously decided, do not record
  it again. The entry disappears; that is the intended path.

## Post-generation

1. Build. Self-correct up to `transpiler.retries` times.
2. Write `purr`: `last_transpiled_commit` = HEAD, `last_transpiled_at`,
   `dependencies` (Model → spec files), `decisions`, and per spec file
   `content_hash` and `outputs`.
3. Emit a `cat-generate` block, then a short human summary.

```cat-generate
status: success | error | partial
commit: b4d8e1f
previous_commit: a3f7c2e
mode: incremental | full
spec_files_processed: [bacon/auth.md]
files_created:
  - path: src/app/(auth)/login/page.tsx
    source: bacon/auth.md
files_modified:
  - path: package.json
    reason: "Added @supabase/ssr"
tests_generated:
  - "Authentication / Password length / Password too short"
decisions:
  - requirement: "Authentication / Session length"
    kind: should_deviation
    reason: "..."
build:
  status: pass | fail
  retries: 0
  errors: []
```

## Incremental runs

```bash
catspec diff .
```

Gives changed spec files, affected spec files after expanding `purr`
dependencies and changed references, and outputs to regenerate. Process only those. Preserve
`purr` entries and outputs for everything else.

## `purr` format

```yaml
last_transpiled_commit: a3f7c2e
last_transpiled_at: 2026-10-14T10:30:00Z

dependencies:
  Team: [bacon/auth.md, bacon/features/tasks.md]
  Profile: [bacon/auth.md, bacon/features/tasks.md]

decisions: []

references:              # reference -> hash of snapshot or local uri, spec files bound to it
  design-tokens:
    content_hash: 9f8e7d6c
    bound_by: [bacon/features/tasks.md]

bacon/auth.md:
  content_hash: a1b2c3d4
  outputs:
    - src/app/(auth)/login/page.tsx
    - src/lib/auth.ts
```

## Quick reference

Copied from SPEC.md §12. Edit there.

```
FILES        bacon/system.md (required), bacon/models.md, bacon/*.md, bacon/features/*.md
FRONTMATTER  name, stack (system file) · feature, using (feature files) · references (any)
SECTIONS     ## Purpose · ## Model: X (+ GFM table, optional Invariants:) ·
             ## Requirements · ## Flow: X (+ numbered steps) · ## View: X (+ prose)
REQUIREMENT  ### Requirement: <name>  body with MUST/SHOULD/MAY, EARS-shaped
SCENARIO     #### Scenario: <name>  - **GIVEN** · - **WHEN** · - **THEN** · - **AND**
INLINE       any sentence with an uppercase BCP 14 keyword, anywhere, is normative
VERBATIM     any fenced code block outside a Model table is copied unchanged
REFERENCE    declared in cat.config.yaml references: (kind, uri, via, snapshot) · bound by
             references: frontmatter · kinds: design design-tokens api schema doc ·
             remote uri needs a snapshot under bacon/refs/; transpile reads only snapshots
TYPES        text integer decimal boolean date timestamp uuid email url json currency
             a, b, c (enum) · Other · Other[]
NOTES        primary key nullable unique auto min N max N default V renamed from F
PRIORITY     verbatim > requirement > Flow/View/Model > prose > discretion
OWNERSHIP    human: bacon/, cat.config.yaml · transpiler: src/, purr
```
