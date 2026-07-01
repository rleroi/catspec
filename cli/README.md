# @catspec/cli

The `cat` CLI for [CaT (Code as Text)](../index.html) projects.

```bash
npm install
npm run build
npm link   # optional: puts `cat` on your PATH
```

## Commands

### `cat validate [dir]`

Deterministic, no LLM required. Reads `bacon/*.md` and `cat.config.yaml`,
runs every check in [`skills/cat-transpiler/SKILL.md`](../skills/cat-transpiler/SKILL.md#phase-1-validate),
and prints a `cat-validate` block. Exits `1` if there are fatal errors.

```bash
cat validate .
cat validate path/to/project
```

### `cat diff [dir]`

Reads `purr`, diffs `bacon/` against `last_transpiled_commit` with git, and
expands the result through the dependency graph recorded in `purr` (e.g.
editing a shared `models.md` also marks every feature file that depends on
it). Prints which spec files changed, which spec files are affected once
dependents are included, and which output files will be regenerated.

```bash
cat diff .
```

### `cat transpile [dir]`

Runs `cat validate` first (skip with `--skip-validate`), then hands the
`cat-transpiler` skill to a local [Cursor agent](https://cursor.com/docs/sdk/typescript)
against `dir`, streaming its output. Requires `CURSOR_API_KEY`.

```bash
export CURSOR_API_KEY=cursor_...
cat transpile . --model composer-2.5
```

Exit codes: `0` success, `1` startup/config failure (fix and retry), `2` the
agent run started but failed mid-flight (inspect it in the Cursor dashboard).

## Design

- `validate` and `diff` are pure, offline, and fast — safe to run in CI on
  every PR.
- `transpile` is the only command that calls an LLM. It always validates
  first; the spec is the source of truth and the CLI refuses to generate code
  from a spec with fatal errors.
- All three commands operate on plain files (`bacon/*.md`, `cat.config.yaml`,
  `purr`) — no daemon, no hidden state.
