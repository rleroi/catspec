# @catspec/cli

The `catspec` CLI for [CaT (Code as Text)](../README.md) projects. Terms:
[GLOSSARY.md](../GLOSSARY.md). Language: [SPEC.md](../SPEC.md).

```bash
npm install
npm run build
npm link        # optional: puts `catspec` on your PATH
npm test        # vitest: lint-rule fixtures + OpenSpec conformance
```

The binary is `catspec`, not `cat`, so it never collides with `/bin/cat`.

## Commands

### `catspec validate [dir] [--strict]`

Deterministic, no LLM. Reads `bacon/*.md` and `cat.config.yaml`, runs every
rule in [SPEC.md §10](../SPEC.md#10-validation), reads `purr` for open
decisions, prints a `cat-validate`
block. Exits `1` on errors. `--strict` also fails on warnings (OpenSpec
parity; use it in CI).

```bash
catspec validate .
catspec validate path/to/project --strict
```

### `catspec verify [dir] [--base <ref>]`

Ownership check from [SPEC.md §11](../SPEC.md#11-phases-and-ownership).
Walks the commits after `purr.last_transpiled_commit` (or `--base`) and
fails when a human commit touched `transpiler.output` or `purr`, or a
commit by `transpiler.bot` (default `cat-transpile-bot`) touched `bacon/` or
`cat.config.yaml`. Prints a `cat-verify` block. Offline, git only.

```bash
catspec verify .
catspec verify . --base origin/master   # on a PR
```

### `catspec diff [dir]`

Reads `purr`, diffs `bacon/` against `last_transpiled_commit` with git, and
expands the result through the dependency graph of Models recorded in `purr`
(editing a shared `models.md` also marks every feature file that references
it). Prints changed spec files, affected spec files, and outputs to
regenerate.

### `catspec transpile [dir]`

Runs `catspec validate` first (skip with `--skip-validate`), then hands the
`cat-transpile` skill to an agent against `dir`. The backend comes from
`transpiler.agent` in `cat.config.yaml`, or `--agent`:

| `agent` | Runs | Needs |
|---|---|---|
| `cursor` (default) | `@cursor/sdk` in-process | `CURSOR_API_KEY`; the optional dependency installed |
| `cursor-cli` | `cursor-agent -p --force --trust` | `cursor-agent` on PATH, `CURSOR_API_KEY` or a login |
| `claude-code` | `claude -p --dangerously-skip-permissions` | `claude` on PATH, a login or `ANTHROPIC_API_KEY` |

`--model` overrides `transpiler.model`. The prompt is the skill file plus
the headless contract, sent on stdin for CLI backends. Permission prompts
are bypassed because nobody is there to answer; ownership is enforced
afterwards by `catspec verify`. Exit codes: `0` success, `1` startup or
config failure, `2` the agent run started but failed.

Adding a backend: one file under `src/lib/agents/` implementing
`AgentBackend`, registered in `agents/index.ts`.

## Design

- `validate`, `verify` and `diff` are pure, offline and fast. Safe on every PR.
- `transpile` is the only command that calls an LLM. It always validates
  first: the CLI refuses to generate from a spec with errors.
- Everything operates on plain files: `bacon/*.md`, `cat.config.yaml`,
  `purr`. No daemon, no hidden state.
- The parser in `src/lib/spec.ts` is CaT's own. The OpenSpec conformance
  test (`test/openspec-conformance.test.ts`) projects the example's
  `## Purpose` and `## Requirements` sections and runs the real
  `openspec validate` on them, so the grammar cannot drift from OpenSpec.
