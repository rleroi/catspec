# CaT Glossary

One definition per term. Other documents link here and do not redefine.
When a term in the table has a banned synonym, use only the canonical form.

## Terms

| Term | Meaning | Do not use |
|---|---|---|
| **CaT** | Code as Text: the language and its toolchain. `catspec` is the repository, the npm scope and the CLI binary. | — |
| **spec** | A project's whole specification: every file under `bacon/`. | "bacon" as a noun |
| **spec file** | One `.md` file under `bacon/`. | — |
| **system file** | `bacon/system.md`. Name, stack, system-wide requirements. | — |
| **feature file** | A spec file with a `feature:` frontmatter field. | — |
| **models file** | `bacon/models.md`. Models shared by more than one feature. | — |
| **language spec** | `SPEC.md`, the definition of CaT itself. | "the spec" when meaning SPEC.md |
| **frontmatter** | The YAML block between `---` lines at the top of a spec file. | front matter, front-matter |
| **construct** | Any piece of a spec file the language recognises: a frontmatter field, a section, a label, a requirement, a scenario, a verbatim block. | marker, signal, element |
| **section** | A recognised heading plus its body: `## Purpose`, `## Requirements`, `## Model:`, `## Flow:`, `## View:`. | structural block, structural heading |
| **label** | The `Invariants:` line under a Model table. | — |
| **requirement** | A normative statement. *Named* when written as a `### Requirement: <name>` block under `## Requirements`; *inline* when it is any sentence with an uppercase BCP 14 keyword elsewhere in the file. | pin, binding sentence, constraint |
| **scenario** | A `#### Scenario: <name>` block under a named requirement, with WHEN / THEN bullets. One scenario becomes one generated test. | acceptance criteria, gherkin block, test case |
| **verbatim block** | A fenced code block anywhere outside a Model table. Copied into output unchanged. | literal, pinned code, fenced code |
| **normative** | Binding on the transpiler. Frontmatter, sections, requirements, scenarios, verbatim blocks. | "binding" when meaning strength |
| **informative** | Context the transpiler may use but is free to interpret. All other prose. | descriptive text |
| **BCP 14 keyword** | MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, REQUIRED, RECOMMENDED, NOT RECOMMENDED, MAY, OPTIONAL. Normative only in uppercase. | RFC 2119 word |
| **EARS** | Easy Approach to Requirements Syntax. The sentence templates a requirement body SHOULD follow: WHEN, WHILE, IF…THEN, WHERE, or plain. | — |
| **Model** (capital M) | A data entity declared with `## Model: <Name>` and a GFM table. | entity, schema, table |
| **Flow** | A `## Flow: <Name>` section: numbered steps describing a sequence of behaviour. | — |
| **View** | A `## View: <Name>` section: prose describing a page or component. | screen, page spec |
| **stack** | The `stack:` map in the system file's frontmatter. | stack binding |
| **provider** | An external service or library a feature depends on, named in `using:`. | — |
| **provider binding** | The `using:` frontmatter field. A feature *binds* providers. | strategy |
| **provider profile** | One entry under `providers:` in `cat.config.yaml`, describing a provider's package, env vars and capabilities. | provider entry |
| **reference** | A thing outside the spec that the spec points at: a design, a design-token file, an API description, a document. One entry under `references:` in `cat.config.yaml` with `kind`, `uri`, optional `via` and `snapshot`. | import, include, attachment, link (for the declared thing) |
| **reference binding** | The `references:` frontmatter field. A spec file *binds* references; the transpiler MUST obey a bound reference according to its `kind`. | — |
| **snapshot** | The committed copy of a reference under `bacon/refs/`, written by `cat-author`, read by `cat-transpile`. Required when the `uri` is remote. | cache, vendored copy, export |
| **via** | The `via: mcp:<server>` field: the MCP server `cat-author` reads a remote reference through. Servers are configured in the agent, never in CaT. | connector, integration |
| **transpile** / **transpiler** | The whole run that turns the spec into output; the role that performs it (CLI plus agent plus LLM). | compile, compiler |
| **phase** | One of four steps of a transpile run: **validate**, **enrich**, **confirm**, **generate**. | "transpile" as the name of phase 4 |
| **validate** | Phase 1. Deterministic checks on spec files and config. `catspec validate`. | lint (acceptable informally) |
| **enrich** | Phase 2. The agent asks questions and writes answers into the spec. | clarify, plan |
| **confirm** | Phase 3. The human approves the enriched spec. | — |
| **generate** | Phase 4. Write output from the spec. | transpile, build, codegen |
| **output** | The generated files. Location is `transpiler.output` in `cat.config.yaml`, default `src/`. | codebase, generated artifact, derived artifact |
| **purr** | The transpile record at the project root: last transpiled commit, content hashes, outputs, dependencies, decisions. | lock file, lockfile, machine state |
| **decision** | A recorded choice the transpiler made where the spec left room: a SHOULD it deviated from, a MAY it skipped, an ambiguity it resolved. Lives in `purr.decisions` until `cat-author` writes the answer into the spec, then it disappears. Current state, not a log. | decision log, ADR |
| **agent** | The LLM runtime executing a skill: Cursor, Claude Code, Kiro CLI, and so on. | — |
| **LLM** | The underlying language model. Use only when the distinction from *agent* or *transpiler* matters. | "the model" |
| **skill** | An instruction file an agent loads: `cat-init`, `cat-author`, `cat-transpile`. | — |
| **author** (verb) | A human, with an agent running `cat-author`, writing or changing the spec. | — |
| **human-owned** | Paths only humans change and commit: `bacon/`, `cat.config.yaml`. | human-authored, 100% human |
| **transpiler-owned** | Paths only `cat-transpile` writes: the output directory and `purr`. | machine-owned, generated |
| **incremental** | A transpile run that regenerates only the outputs of changed spec files and their dependents, using `purr` and `git diff`. | — |
| **full** | A transpile run that regenerates every output. | — |
| **spectrum of control** | The five levels of authority in a spec file, lowest to highest: Intent, Binding, Structure, Requirement, Verbatim. | — |
| **specificity hierarchy** | Conflict rule: verbatim block > requirement > Flow / View / Model > prose > transpiler discretion. | — |
| **conformance** | A spec file with frontmatter, Model, Flow and View sections and verbatim blocks removed is a valid OpenSpec `spec.md`. | compatibility |

## Spectrum of control

| Level | Construct | Transpiler decides |
|---|---|---|
| Intent | informative prose | everything |
| Binding | `stack:`, `using:`, `references:` | wiring and idiom, not the provider or the reference |
| Structure | Model, Flow, View | implementation of the declared shape |
| Requirement | named and inline requirements, scenarios | how, never whether |
| Verbatim | verbatim block | nothing |

## Writing conventions

- `Model`, `Flow`, `View`, `Purpose`, `Requirements` are capitalised when they mean the construct. Requirement, scenario, verbatim block, section, label are lowercase.
- File names, directory names, frontmatter keys, config keys and lint codes go in code format: `bacon/`, `purr`, `using:`, `W_NO_PURPOSE`.
- BCP 14 keywords are uppercase only when normative. Lowercase must, should, may are ordinary English.
- Do not state counts of constructs in prose ("the four frontmatter fields"). Counts drift. Use a table.
- `transpiler.model` in `cat.config.yaml` is the one place where "model" means the LLM. It follows SDK convention and is the documented exception.
- Skill names are verbs: `cat-init`, `cat-author`, `cat-transpile`. Structured output blocks are named after phases: `cat-validate`, `cat-enrich`, `cat-generate`.
- CLI commands are verbs: `catspec validate`, `catspec verify`, `catspec diff`, `catspec transpile`. A command that is not a phase emits a block named after itself: `cat-verify`.
- Lint codes: `E_` for errors, `W_` for warnings, then `REQ`, `SCENARIO`, `MODEL`, `FLOW`, `FEATURE`, `PROVIDER`, `REFERENCE`, `FIELD` as the subject, then the condition. `E_REQ_NO_BODY`, `W_SCENARIO_NO_THEN`.
- Authoring reads remote sources through MCP; transpiling reads only committed files. "MCP at author time, files at transpile time."

## Standards referenced

| Standard | Used for |
|---|---|
| [CommonMark](https://spec.commonmark.org/) + [GFM tables](https://github.github.com/gfm/#tables-extension-) | file format |
| [YAML frontmatter](https://jekyllrb.com/docs/front-matter/) | metadata |
| [BCP 14](https://www.rfc-editor.org/info/bcp14): RFC 2119 + RFC 8174 | requirement strength |
| [EARS](https://alistairmavin.com/ears/) | requirement sentence shape |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | `## Purpose`, `## Requirements`, `### Requirement:`, `#### Scenario:` grammar |
| [SemVer](https://semver.org/) | `version:` in `cat.config.yaml` |
| [W3C Design Tokens (DTCG)](https://www.designtokens.org/tr/drafts/format/) | `kind: design-tokens` references |
| [OpenAPI](https://spec.openapis.org/oas/latest.html), [GraphQL SDL](https://spec.graphql.org/), [AsyncAPI](https://www.asyncapi.com/docs/reference/specification/latest) | `kind: api` references |
| [JSON Schema](https://json-schema.org/) | `kind: schema` references |
| [MCP](https://modelcontextprotocol.io/) | `via: mcp:<server>`, how `cat-author` reads remote references |
