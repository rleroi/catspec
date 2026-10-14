# CaT design rationale

Why the language looks the way it does. Informative. The language itself is
[SPEC.md](../SPEC.md); terms are in [GLOSSARY.md](../GLOSSARY.md).

## Why plain Markdown

- An unrecognised heading is never an error. Markdown never promised a closed
  vocabulary of headings, so the transpiler treats anything it does not
  recognise as informative prose.
- A fenced code block has an unambiguous end, the closing fence. Indentation
  based blocks do not. That is why "verbatim" needs no heading of its own.
- Frontmatter is the one place that needs a closed vocabulary, and YAML
  already defines how it parses.
- The file extension stays `.md`. What makes a file a spec file is living
  under `bacon/`, not its extension. GitHub and every editor render it.

## Why OpenSpec's requirement grammar instead of our own

The first draft invented EARS sentences with numeric IDs (`AUTH-3:`) and
fenced Gherkin for scenarios. OpenSpec already ships the same idea as
Markdown headings: `## Requirements`, `### Requirement: <name>`,
`#### Scenario: <name>` with bold GIVEN / WHEN / THEN bullets. It has a
parser, a validator, and skills for most agents. Adopting it unchanged means:

- a CaT spec file with the CaT-only parts removed is a valid OpenSpec
  `spec.md`, and the CLI test suite proves it against the real
  `openspec validate`;
- a requirement's name is its identity, which reads better in test names and
  `purr` than a number;
- no second syntax to learn for people who already use OpenSpec.

Two deviations, both documented in SPEC.md §1.2: SHOULD and MAY are
meaningful because the transpiler, not a human, chooses; and a requirement
without a scenario is a warning unless `--strict`.

## Why not Gherkin `.feature` files

Cucumber tooling assumes a `.feature` file contains only scenarios. CaT needs
stack, providers, Models and views next to behaviour in one readable file.
Splitting those out to stay Cucumber-compatible trades one format for three
glued together by a naming convention. OpenSpec's scenario bullets give the
GIVEN / WHEN / THEN shape without the file-level constraint.

## Why BCP 14 and EARS

RFC 2119 words are the most widely understood way to say how hard a rule is.
RFC 8174 adds the uppercase-only rule, so "should" in ordinary prose stays
ordinary English. BCP 14 defines strength, not structure, so EARS supplies
the sentence shape: WHEN, WHILE, IF…THEN, WHERE, or plain. Kiro's regression
form, `WHEN x, the system MUST CONTINUE TO y`, is added because regenerated
code needs a way to say "do not lose this".

## Why requirements are not a container

A sentence with an uppercase keyword anywhere in the file is normative. Real
specs do not segregate their MUST statements into an appendix; they write
"the server MUST respond within 5 seconds" in the paragraph about responses.
Named requirements under `## Requirements` add identity and scenarios on
top, for behaviour that deserves a test. Library and implementation choices
("MUST use `@hello-pangea/dnd`") stay inline in Flow or View prose so the
`## Requirements` section remains behaviour-only and OpenSpec-valid.

## Why `src/` and `purr` are committed

Incremental transpile needs the previous output as a baseline, and the
`purr` diff is the review record. Ownership is enforced by convention and
tooling, not by keeping the output out of git: `.gitattributes` marks the
paths generated, `CODEOWNERS` assigns them to the bot identity, and the CI
workflow refuses to transpile commits made by the bot itself.

## Why `purr` lives outside `bacon/`

A diff under `bacon/` means a human changed the spec. If the transpiler wrote
state there, every run would look like a spec change. `cat.config.yaml` sits
outside for the same reason in reverse: it is infrastructure a human tunes,
not specification.

## Why two skills

Authoring is interactive: ask, write answers into `bacon/`, confirm. Transpiling
is headless: never ask, never edit `bacon/`, decide and record. One skill
mixing both rules produced contradictions (the transpiler "proposing" spec
edits in CI with nobody to approve them). `cat-author` and `cat-transpile`
each have one contract.

## Why references point and do not inline

Kiro steering files inline other files with `#[[file:…]]`; Claude Code
reads `@path` into context. CaT instead declares a reference once with a
`kind`, because the kind is what tells the transpiler its obligation: a token
file is generated from, an API description is never invented beyond, a
document is context. Nothing is inlined, so "import" and "include" are
banned terms.

MCP is used at author time only. `cat-author` reads Figma or hosted docs
through the server named in `via:` and commits a snapshot under
`bacon/refs/`. `cat-transpile` runs offline in CI and reads only the
snapshot. Same reasoning as committing `src/`: a headless run must be
reproducible from the repository alone.

## Where CaT sits among the tools

Martin Fowler's taxonomy: spec-first (generate once, discard: Kiro, GitHub
Spec Kit), spec-anchored (keep and update alongside code: OpenSpec),
spec-as-source (regenerate code from spec: Tessl, CaT). CaT takes OpenSpec's
grammar, Tessl's DO NOT EDIT output marker, Kiro's CONTINUE TO regression
form, and adds the system layer.

The known risks of spec-as-source are non-determinism across runs, the
inflexibility of "a fix is a spec change", and the absence of proof at
scale. The planned answer is the twenty-change experiment: take `example/`
through twenty real spec changes with no hand edits to `src/`. If that fails,
the project stops.

Sources: Fowler, [SDD tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html);
[Kiro specs](https://kiro.dev/docs/specs/); [OpenSpec](https://github.com/Fission-AI/OpenSpec);
[Tessl deep dive](https://www.cognix-studio.com/blog/spec-driven-development-tessl/);
[Spec Kit vs Kiro vs Tessl](https://particula.tech/blog/spec-driven-development-tools-spec-kit-vs-kiro-vs-tessl).
