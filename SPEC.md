# CaT Language Specification

**Version:** 0.2-draft
**Status:** Working draft

CaT (Code as Text) is a way to write a software specification that humans
read and a transpiler turns into working code. This document defines the
language. Terms are defined once, in [GLOSSARY.md](GLOSSARY.md).

In one sentence: **CaT is OpenSpec's spec format plus a system layer, for
projects where the transpiler writes the code.**

CaT invents as little as possible. Three tiers:

| Tier | What | Source |
|---|---|---|
| Used unchanged | file format, metadata, requirement strength, requirement and scenario grammar | [CommonMark](https://spec.commonmark.org/) + [GFM tables](https://github.github.com/gfm/#tables-extension-), [YAML frontmatter](https://jekyllrb.com/docs/front-matter/), [BCP 14](https://www.rfc-editor.org/info/bcp14), [OpenSpec](https://github.com/Fission-AI/OpenSpec) `## Purpose` / `## Requirements` / `### Requirement:` / `#### Scenario:` |
| Guidance | requirement sentence shape | [EARS](https://alistairmavin.com/ears/) |
| CaT's own | `stack:`, `feature:`, `using:` frontmatter; `## Model:`, `## Flow:`, `## View:` sections; verbatim blocks; `purr` | this document |

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT,
RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL in this document are to be
interpreted as described in BCP 14 when, and only when, they appear in all
capitals.

---

## 1. Conformance

### 1.1 Normative and informative

Every piece of a spec file is either **normative** (binding on the
transpiler) or **informative** (context the transpiler may use but is free
to interpret). Normative content is exactly:

1. Frontmatter fields.
2. `## Model:` tables and their `Invariants:` list.
3. `## Flow:` numbered steps.
4. Named requirements and their scenarios under `## Requirements`.
5. Inline requirements: any sentence containing an uppercase BCP 14 keyword.
6. Verbatim blocks.

Everything else is informative prose. If prose and a normative construct
disagree, the normative construct wins. When normative constructs conflict,
the more specific wins:

```
verbatim block  >  requirement  >  Flow / View / Model  >  prose  >  transpiler discretion
```

### 1.2 OpenSpec compatibility

A spec file that has a `## Requirements` section, with its frontmatter,
`## Model:`, `## Flow:` and `## View:` sections, and verbatim blocks removed,
MUST be a valid OpenSpec `spec.md`. `## Purpose` and `## Requirements` are
OpenSpec's sections, used unchanged. The CLI's conformance test enforces
this against the example project.

Two deliberate deviations from OpenSpec guidance, both because the
transpiler, not a human, decides how to implement:

- SHOULD and MAY are meaningful and encouraged (§5.2). OpenSpec recommends
  SHALL/MUST only.
- A requirement without a scenario is a warning, not an error, unless
  `catspec validate --strict` is used.

---

## 2. Files and layout

```
cat.config.yaml       transpiler settings + provider profiles   (human-owned)
bacon/                                                          (human-owned)
  system.md           REQUIRED. Name, stack, system-wide requirements
  models.md           OPTIONAL. Models shared by more than one feature
  *.md                feature files
  features/*.md       feature files (same format, just organised)
  refs/               snapshots of references (§7.1)
purr                  transpile record                           (transpiler-owned)
src/                  output, default location                   (transpiler-owned)
```

Every `.md` under `bacon/` is a *spec file*. `system.md` is the *system
file*. A spec file with a `feature:` frontmatter field is a *feature file*.

Ownership is normative. Humans, with an agent running `cat-author`, change
human-owned paths. Only `cat-transpile` changes transpiler-owned paths. A
transpile run MUST NOT modify `bacon/` or `cat.config.yaml` (§11).

---

## 3. Frontmatter

A spec file MAY start with a YAML frontmatter block delimited by `---`.

| Field | Where | Required | Meaning |
|---|---|---|---|
| `name` | system file | yes | Name of the system |
| `stack` | system file | yes | Map of `framework`, `language`, `database`, `auth`, `styling`, `deploy`. Free-text values. |
| `feature` | feature files | yes | Human name of the feature. MUST be unique across the project. |
| `using` | feature files | no | List of provider names. Each SHOULD match a provider profile's `name` in `cat.config.yaml`. The transpiler MUST use these providers and MUST NOT substitute others. |
| `references` | any spec file | no | List of reference names. Each MUST match a key under `references:` in `cat.config.yaml` (§7.1). |

Unknown fields are allowed and passed to the transpiler as hints.

---

## 4. Sections

A section is a recognised heading plus its body, matched case-insensitively
at heading level `##` or deeper. Any heading that is not listed here is
informative prose and is never an error.

### 4.1 `## Purpose`

One paragraph: what the feature or system is for. RECOMMENDED in every spec
file. A missing Purpose is a warning.

### 4.2 `## Model: Name`

Followed by a GFM table with columns `Field | Type | Notes`.

**Type** is one of:

| Type | Meaning |
|---|---|
| `text`, `integer`, `decimal`, `boolean`, `date`, `uuid`, `email`, `url`, `json` | primitives |
| `timestamp` | UTC, ISO 8601 |
| `currency` | integer minor units plus ISO 4217 code |
| `a, b, c` | enum: comma-separated values |
| `Other` | reference to the Model named `Other` |
| `Other[]` | list of references |

**Notes** is free text. These words are understood: `primary key`,
`nullable`, `unique`, `auto`, `min N`, `max N`, `default V`,
`renamed from F` (signals a rename so an incremental run writes a column
rename, not a drop and add).

A Model table MAY be followed by the label `Invariants:` and a bullet list.
Each bullet is an inline requirement (§5.4) scoped to that Model, and MUST
contain a BCP 14 keyword.

Model names MUST be unique across the project. A Model referenced from more
than one feature file SHOULD live in `bacon/models.md`.

### 4.3 `## Requirements`

Named requirements and their scenarios. Grammar in §5.

### 4.4 `## Flow: Name`

Followed by a numbered list: the narrative sequence, what happens in order.
Steps say *what*, not *how*. A Flow MUST have at least one step. Conditions
and failure handling are prose after the list. Refer to the triggering
action ("if sending the email fails"), not a step number.

A Flow is the story. Scenarios (§5.3) are the tests. Do not restate a Flow
as scenarios; write scenarios for the requirements the Flow must satisfy.

### 4.5 `## View: Name`

Followed by prose describing a page or component. No sequential steps.

---

## 5. Requirements

### 5.1 Grammar

Under `## Requirements`, OpenSpec grammar, unchanged:

```markdown
## Requirements

### Requirement: <name>
<body: one to three sentences containing an uppercase BCP 14 keyword>

#### Scenario: <name>
- **GIVEN** <optional starting state>
- **WHEN** <trigger>
- **THEN** <outcome>
- **AND** <more>
```

Rules:

- The requirement name is its identity. Names MUST be unique within a spec
  file and are matched case-sensitively. The pair *feature name / requirement
  name* identifies a requirement across the project.
- The body MUST be present and MUST contain a BCP 14 keyword. The body
  SHOULD be at most 500 characters. State one behaviour per requirement;
  move examples and edge cases into scenarios.
- Each requirement SHOULD have at least one scenario.
- A GFM table MAY follow a scenario's bullets to give example values.
- Renaming a requirement changes its identity. Generated tests and `purr`
  entries that reference the old name are regenerated.

### 5.2 Strength

| Keyword | Transpiler obligation |
|---|---|
| MUST, MUST NOT, SHALL, SHALL NOT, REQUIRED | Non-negotiable. Implement it. Where feasible emit a test or constraint that enforces it. Output that provably violates a MUST is a failed run. |
| SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED | Default behaviour. Deviate only for a concrete reason, and record that reason as a decision in `purr`. |
| MAY, OPTIONAL | Permitted, not required. Implement if cheap and consistent; otherwise skip silently. |

Lowercase must, should, may are ordinary English (RFC 8174).

### 5.3 Body shape: EARS

The body SHOULD follow one EARS template, with the EARS word *shall*
replaced by a BCP 14 keyword. Trigger words are uppercase:

| Pattern | Template |
|---|---|
| Ubiquitous | The system MUST `<response>`. |
| Event-driven | WHEN `<trigger>`, the system MUST `<response>`. |
| State-driven | WHILE `<state>`, the system MUST `<response>`. |
| Unwanted behaviour | IF `<condition>`, THEN the system MUST `<response>`. |
| Optional feature | WHERE `<feature is present>`, the system MUST `<response>`. |
| Regression guard | WHEN `<trigger>`, the system MUST CONTINUE TO `<existing response>`. |

Patterns compose. "The system" MAY be a more specific subject. A body that
fits no template is still normative; the validator only warns.

Scenarios are the EARS event form made concrete: WHEN is the trigger, THEN
is the response, GIVEN is the state.

### 5.4 Inline requirements

Any sentence containing an uppercase BCP 14 keyword, anywhere outside
`## Requirements`, is an *inline requirement*. It is normative at the
keyword's strength. Use inline requirements for Invariants, for rules inside
Flow or View prose, and for system-wide rules in the system file. Inline
requirements have no name and no scenarios, so nothing traces back to them.
Promote an inline requirement to a named one when it describes testable
behaviour.

### 5.5 Scope

A requirement in the system file applies to the whole project. A requirement
in a feature file applies to that feature. When both address the same
subject, the feature-level requirement wins.

### 5.6 Library and implementation choices

A requirement that names a library or an implementation detail ("MUST use
`@hello-pangea/dnd`") is allowed, but SHOULD be an inline requirement in
Flow or View prose or a `stack:` / `using:` entry, not a named requirement.
`## Requirements` stays about behaviour and remains OpenSpec-valid.

---

## 6. Verbatim blocks

Any fenced code block outside a Model table is copied into the output
exactly. Use it when the bytes matter: an SQL policy, a config file, a
regex. The transpiler MUST NOT alter a verbatim block. It decides where the
block goes from the info string and the surrounding prose.

---

## 7. Provider binding

`using:` lists providers by display name. If a provider profile with that
`name` exists under `providers:` in `cat.config.yaml`, its fields (`package`,
`env`, `capabilities`, and any hints) guide idiomatic usage. A missing
profile is a warning; the transpiler then uses general knowledge.

### 7.1 References

A *reference* is a thing outside the spec that the spec points at: a design
file, a design-token file, an API description, a document. A reference is
declared once under `references:` in `cat.config.yaml` and bound from a spec
file with the `references:` frontmatter field, parallel to `using:`.

A Markdown link anywhere in a spec file is informative. A reference binding
is normative: the transpiler MUST read every bound reference and obey it
according to its `kind`.

Each reference has:

| Field | Required | Meaning |
|---|---|---|
| `kind` | yes | `design`, `design-tokens`, `api`, `schema` or `doc`. Drives the transpiler's obligation (table below). |
| `uri` | yes | Where the reference lives: a path relative to the project root, or a URL. Provenance. |
| `via` | no | `mcp:<server>`. The MCP server `cat-author` reads a remote `uri` through. The server is configured in the agent, not in CaT. |
| `snapshot` | no | Path relative to the project root, under `bacon/refs/`, holding a copy of what the transpiler needs: exported images, tokens, an OpenAPI file. |

The transpile run is headless and offline. It reads only local files. So a
reference with a remote `uri` MUST have a `snapshot`, and `cat-transpile`
reads the snapshot, never the `uri`. `cat-author` refreshes snapshots when it
reads the remote source, and the snapshot is committed like any other
human-owned file.

| `kind` | Format | Transpiler obligation |
|---|---|---|
| `design` | Figma, Penpot, exported images under the snapshot | Match the layout, copy and component structure. The snapshot is the truth at transpile time; View prose fills gaps. |
| `design-tokens` | W3C Design Tokens (DTCG) JSON | Generate the theme from the tokens. MUST NOT hardcode a colour, size or font that exists as a token. |
| `api` | OpenAPI, GraphQL SDL, AsyncAPI | Generate clients and types from it. MUST NOT invent an endpoint, operation or field the description lacks. |
| `schema` | JSON Schema | Same as `api`, for data shapes. |
| `doc` | Markdown, text, PDF | Context. Informative unless a requirement names it. |

Reserved for a later version, not yet normative: `code` (an existing
code the transpiler reads and calls but never regenerates) and `spec`
(another CaT or OpenSpec spec in a different repository).

---

## 8. Resolution

Model names and feature names are unique across `bacon/` and matched by
exact, case-sensitive text. Forward references are allowed: a field may
have type `Team` before `Team` is defined in another file, because the
transpiler reads every spec file before resolving anything. Only Type-column
values and frontmatter fields participate in resolution. Unknown headings
never do.

---

## 9. Configuration

`cat.config.yaml` at the project root:

```yaml
version: 0.2            # CaT language version this project targets
transpiler:
  model: claude-sonnet-4 # LLM id. The one place "model" means the LLM.
  strategy: incremental  # or full
  output: src/
  retries: 2             # self-correction attempts on build failure
  bot: cat-transpile-bot # git author of transpile commits; `catspec verify` uses it
providers:
  supabase-auth:
    name: Supabase Auth  # matched by `using:`
    package: "@supabase/supabase-js"
    env: [NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY]
references:
  design-tokens:
    kind: design-tokens
    uri: bacon/refs/tokens.json
  dashboard-design:
    kind: design
    uri: https://www.figma.com/design/AbC123/TaskFlow?node-id=12-34
    via: mcp:figma            # cat-author reads it here
    snapshot: bacon/refs/dashboard/   # cat-transpile reads only this
```

Provider profile fields other than `name` are hints, read as prose.
Reference fields are defined in §7.1.

---

## 10. Validation

A conforming validator reports at least these. `--strict` turns every
warning into a failure.

| Code | Severity | Condition |
|---|---|---|
| `E_NO_SYSTEM` | error | no `bacon/system.md` |
| `E_NO_NAME_DECL`, `E_MISSING_STACK` | error | system file frontmatter incomplete |
| `E_INVALID_CONFIG` | error | `cat.config.yaml` missing or without `version` and `transpiler` |
| `E_NO_FEATURE_DECL` | error | file under `features/` with no `feature:` |
| `E_DUPLICATE_MODEL`, `E_DUPLICATE_FEATURE` | error | name clash |
| `E_UNRESOLVED_REF` | error | Type names a Model that does not exist |
| `E_EMPTY_FLOW` | error | Flow with no numbered steps |
| `E_DUPLICATE_REQ` | error | same requirement name twice in one file |
| `E_REQ_NO_BODY` | error | no text between `### Requirement:` and its first scenario |
| `E_SCENARIO_OUTSIDE_REQ` | error | `#### Scenario:` not under a `### Requirement:` |
| `E_SCENARIO_NO_THEN` | error | scenario without a THEN bullet |
| `W_NO_PURPOSE` | warning | spec file without `## Purpose` |
| `W_REQ_NO_KEYWORD` | warning | requirement body without a BCP 14 keyword |
| `W_REQ_NO_SCENARIO` | warning | requirement with no scenario |
| `W_REQ_NOT_EARS` | warning | body matches no EARS template |
| `W_REQ_LONG` | warning | body longer than 500 characters |
| `W_NO_FIELD_TYPE`, `W_NO_PRIMARY_KEY` | warning | Model table gaps |
| `W_SPARSE_FEATURE` | warning | feature file with no `using`, Model, Flow, View or requirement |
| `W_NO_PROVIDER_PROFILE` | warning | `using:` name without a provider profile |
| `E_UNKNOWN_REFERENCE` | error | `references:` name not declared in `cat.config.yaml` |
| `E_REFERENCE_KIND` | error | reference without `kind`, `uri`, or with an unknown `kind` |
| `W_REFERENCE_MISSING` | warning | local `uri` or `snapshot` path not found |
| `W_REFERENCE_NO_SNAPSHOT` | warning | remote `uri` without a `snapshot`; transpile cannot read it |
| `W_DECISIONS_OPEN` | warning | `purr.decisions` is not empty; resolve them into the spec with `cat-author` |
| `W_CROSS_FEATURE_MODEL` | warning | Model in a feature file referenced from another file |

---

## 11. Phases and ownership

A transpile run has four phases. Two skills split them by who is present.

| Phase | Skill | Writes | May ask the human |
|---|---|---|---|
| validate | both, via `catspec validate` | nothing | no |
| enrich | `cat-author` | `bacon/` | yes |
| confirm | `cat-author` | nothing | yes |
| generate | `cat-transpile` | output, `purr` | no |

`cat-author` is interactive. It turns a conversation into spec files, runs
validate until clean, and ends with a commit of human-owned paths.

`cat-transpile` is headless. It runs in CI or locally without a human. It
MUST NOT ask questions and MUST NOT modify human-owned paths. When the spec
leaves room, it decides, records the decision in `purr`, and moves on. When
the spec is contradictory, it fails with the offending requirement names.

Ownership is checked by `catspec verify`. It walks the commits after
`purr.last_transpiled_commit` (or `--base <ref>`) and fails when a commit
not authored by `transpiler.bot` touches the output directory or `purr`, or
a commit authored by the bot touches `bacon/` or `cat.config.yaml`. CI
SHOULD run it on every push.

Generate rules:

1. Existing output is context. Prefer the smallest change that satisfies
   the changed spec. Outputs of unchanged spec files MUST stay byte-identical.
2. Every output file starts with a comment in that file's syntax:
   `GENERATED FROM bacon/<file> BY CaT - DO NOT EDIT`.
3. One scenario becomes one test, named `<feature> / <requirement> / <scenario>`.
4. Every MUST that can be enforced by a constraint, policy or test is.
5. After generating, run the project's build. On failure, self-correct up to
   `transpiler.retries` times, then fail the run.
6. Write `purr` last.

### 11.1 `purr`

```yaml
last_transpiled_commit: a3f7c2e
last_transpiled_at: 2026-10-14T10:30:00Z

dependencies:            # Model -> spec files that reference it
  Team: [bacon/auth.md, bacon/features/tasks.md]

decisions:
  - spec: bacon/auth.md
    requirement: Session length
    kind: should_deviation   # should_deviation | may_skipped | ambiguity
    reason: "Supabase default is 1h; set JWT expiry to 7d via project config instead of code"

references:              # reference -> spec files bound to it, hash of its snapshot or local uri
  design-tokens:
    content_hash: 9f8e7d6c
    bound_by: [bacon/features/tasks.md]

bacon/auth.md:
  content_hash: a1b2c3d4
  outputs:
    - src/app/(auth)/login/page.tsx
    - src/lib/auth.ts
```

#### Decision lifecycle

`decisions` is current state, not a log. History is git, because `purr` is
committed. Every decision is a hole in the spec, and the spec is where it
gets filled.

1. One entry per `(spec, requirement, kind)`. A repeated decision overwrites,
   never appends.
2. An incremental run rewrites the decisions of the spec files it regenerated
   and carries the others over. A full run rewrites all.
3. A decision whose spec file or requirement no longer exists is dropped.
4. `cat-author` reads `decisions` during validate and resolves each one by
   making the spec explicit: an `ambiguity` becomes a requirement or
   scenario; a `should_deviation` becomes a changed requirement, or the
   SHOULD is reworded so the deviation is the default; a `may_skipped`
   becomes a MUST or is removed. The next transpile then finds no room to
   decide, and the entry disappears.

So the list is bounded by the number of open SHOULDs, MAYs and ambiguities
in the spec, and shrinks as the spec gets precise. `catspec validate` warns
with `W_DECISIONS_OPEN` while any remain.

An incremental run diffs `bacon/` against `last_transpiled_commit`, expands
the changed files through `dependencies` and `references`, and regenerates
only those outputs. A changed snapshot regenerates every file bound to it.
If `purr` is missing or the commit is unreachable, the run is full.

---

## 12. Quick reference

Copied verbatim into each skill. Edit here, then re-copy.

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

---

## Appendix A. Why these standards

- **OpenSpec** already encodes requirement plus scenario as Markdown
  headings, with a validator and skills for most agents. Reusing it means a
  CaT spec is readable by tools that have never heard of CaT.
- **BCP 14** is the most widely understood way to say how hard a rule is.
- **EARS** removes the usual ambiguity in free-text requirements: *when* a
  rule applies. Five templates cover nearly everything.
- **DTCG, OpenAPI, JSON Schema** are what design and API tooling already
  emit. A reference points at a file in one of these formats; CaT defines
  no format of its own for designs, tokens or APIs. **MCP** is how agents
  already reach Figma and private docs, so `cat-author` uses it and CaT
  never configures it.
- **Markdown plus frontmatter** needs no plugin, renders on GitHub, and
  diffs cleanly. The diff of `bacon/` is the change request.

## Appendix B. Prior art and position

Fowler's taxonomy: *spec-first* (spec written, then code hand-written, spec
discarded: Kiro, GitHub Spec Kit), *spec-anchored* (spec kept and updated
alongside hand-written code: OpenSpec), *spec-as-source* (humans edit only
the spec: Tessl, CaT). CaT takes OpenSpec's grammar, Tessl's DO NOT EDIT
output marker, Kiro's CONTINUE TO regression form, the reference idea from
Kiro steering file includes and Tessl `@use`, and adds the system
layer that those tools keep out of specs because a human writes their code.
Known open risks of spec-as-source, acknowledged: non-deterministic
regeneration, and the overhead of routing every small fix through the spec.
