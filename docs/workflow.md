# CaT workflow

How a change travels from a conversation to running code. Informative. The
language is [SPEC.md](../SPEC.md); terms are in [GLOSSARY.md](../GLOSSARY.md).

```
          local, interactive                      CI, headless
┌──────────────────────────────────┐   ┌──────────────────────────────────────┐
│ human + agent running cat-author │   │ GitHub Action on push to bacon/**    │
│                                  │   │                                      │
│  1 validate   catspec validate   │   │  5 validate   catspec validate       │
│  2 enrich     edit bacon/        │   │               catspec verify         │
│  3 confirm    human approves     │   │  6 generate   cat-transpile          │
│  4 commit     bacon/, config     │──▶│               writes src/, purr      │
│                                  │   │  7 commit     as cat-transpile-bot   │
└──────────────────────────────────┘   └──────────────────────────────────────┘
```

## Roles and ownership

| Path | Owner | Written by |
|---|---|---|
| `bacon/`, `cat.config.yaml` | human | a human, with `cat-author` |
| `bacon/refs/` | human | `cat-author`, snapshots of references |
| `src/` (or `transpiler.output`), `purr` | transpiler | `cat-transpile`, committed as `transpiler.bot` |

Both sides are committed. `catspec verify` fails the build when a human
commit touches transpiler-owned paths or a bot commit touches human-owned
paths. `.gitattributes` collapses generated paths in GitHub diffs and
`CODEOWNERS` routes them to the bot identity.

## Day one: scaffold

Load `cat-init` in any agent. It asks for the stack and providers, writes
`cat.config.yaml`, `bacon/system.md`, the workflow, `.gitattributes` and
`CODEOWNERS`. Set `transpiler.agent` to the agent that will run in CI and
add its API key as a repository secret.

## Every change: author

Load `cat-author`. Describe the feature or the change. The agent:

1. Runs `catspec validate`. Errors are fixed first. Open decisions in
   `purr.decisions` come next: each is a hole in the spec the transpiler
   had to fill alone, and the fix is to make the spec say it.
2. Enriches. Asks about what could go wrong silently, then writes the
   answers into `bacon/`: a `## Purpose`, named requirements with scenarios,
   Models a Flow implies, `using:` for providers, `references:` for designs
   and API descriptions. The spec diff is the plan; there is no separate
   plan document.
3. Shows the diff and a `cat-enrich` block. You confirm.
4. Commits human-owned paths and pushes.

The agent never touches `src/`. If you want different code, you change the
spec.

## Every push: transpile

The workflow runs on `bacon/**` and `cat.config.yaml` changes, never on a
push by the bot itself.

1. `catspec validate --strict` and `catspec verify`. Either failing stops
   the run.
2. `catspec transpile` hands `cat-transpile` to the configured agent. The
   agent runs `catspec diff` to find changed spec files and their
   dependents, regenerates only those outputs, keeps everything else
   byte-identical, builds, self-corrects up to `transpiler.retries` times,
   and writes `purr` last.
3. The workflow commits `src/`, `purr` and dependency files as
   `cat-transpile-bot` and pushes.

Where the spec left room, the agent decides and records the decision in
`purr.decisions`. Those show up as `W_DECISIONS_OPEN` on the next
`cat-author` session, which resolves them into the spec.

## Locally, without CI

```bash
catspec validate . --strict
catspec transpile . --agent claude-code     # or cursor, cursor-cli
catspec verify .
git -c user.name=cat-transpile-bot -c user.email=cat-transpile-bot@users.noreply.github.com \
  commit -am "transpile: $(git rev-parse --short HEAD)"
```

Commit the output as the bot, not as yourself, or `verify` will flag it.

## Reviewing a transpile commit

Read the `purr` diff first: new outputs, changed hashes, decisions. Then
the generated tests, one per scenario, named
`<feature> / <requirement> / <scenario>`. The code itself is last. A wrong
line in `src/` is a bug report against the spec, not a line to edit.

## When the transpiler fails

- Validation error: fix the spec with `cat-author`.
- Contradiction: the agent fails and names the requirements. Resolve in the
  spec.
- Build failure after retries: read the run log, then make the requirement
  more precise or add a verbatim block for the part the agent keeps getting
  wrong.
- Decision you disagree with: resolve it in the spec. Do not patch `src/`.
