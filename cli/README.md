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
rule in [SPEC.md §10](../SPEC.md#10-validation), prints a `cat-validate`
block. Exits `1` on errors. `--strict` also fails on warnings (OpenSpec
parity; use it in CI).

```bash
catspec validate .
catspec validate path/to/project --strict
```

### `catspec diff [dir]`

Reads `purr`, diffs `bacon/` against `last_transpiled_commit` with git, and
expands the result through the Model dependency graph recorded in `purr`
(editing a shared `models.md` also marks every feature file that references
it). Prints changed spec files, affected spec files, and outputs to
regenerate.

### `catspec transpile [dir]`

Runs `catspec validate` first (skip with `--skip-validate`), then hands the
`cat-transpile` skill to an agent against `dir`. Today the backend is a
[Cursor agent](https://cursor.com/docs/sdk/typescript) and needs
`CURSOR_API_KEY`. Exit codes: `0` success, `1` startup or config failure,
`2` the agent run started but failed.

## Design

- `validate` and `diff` are pure, offline and fast. Safe on every PR.
- `transpile` is the only command that calls an LLM. It always validates
  first: the CLI refuses to generate from a spec with errors.
- Everything operates on plain files: `bacon/*.md`, `cat.config.yaml`,
  `purr`. No daemon, no hidden state.
- The parser in `src/lib/spec.ts` is CaT's own. The OpenSpec conformance
  test (`test/openspec-conformance.test.ts`) projects the example's
  `## Purpose` and `## Requirements` sections and runs the real
  `openspec validate` on them, so the grammar cannot drift from OpenSpec.
