# CaT — Code as Text

Human-readable spec in, working code out. The spec is the source of truth;
the transpiler writes the code.

**CaT is OpenSpec's spec format plus a system layer, for projects where the
transpiler writes the code.**

- [SPEC.md](SPEC.md): the language.
- [GLOSSARY.md](GLOSSARY.md): every term, once. `scripts/lint-docs.sh` enforces it.
- [docs/design.md](docs/design.md): why the language looks like this.
- [example/bacon/](example/bacon/): a complete spec for a small app.
- [skills/](skills/): `cat-init`, `cat-author`, `cat-transpile`.
- [cli/](cli/): `catspec validate | verify | diff | transpile`.

## Three tiers, nothing new where something existed

| Tier | What | From |
|---|---|---|
| Used unchanged | CommonMark + GFM tables, YAML frontmatter, BCP 14 (RFC 2119/8174), and OpenSpec's `## Purpose` / `## Requirements` / `### Requirement:` / `#### Scenario:` grammar | the standards |
| Guidance | EARS sentence templates for requirement bodies | EARS |
| CaT's own | `stack:`, `feature:`, `using:`, `references:` frontmatter; `## Model:`, `## Flow:`, `## View:` sections; verbatim blocks; the `purr` transpile record | SPEC.md |

A CaT feature file with the CaT-only parts removed is a valid OpenSpec
spec. The CLI test suite proves it against the real `openspec validate`.

## A feature file

```markdown
---
feature: Authentication
using: [Supabase Auth]
---

## Purpose
Users sign up with email or Google. A Profile is created on first login.

## Model: Profile
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| display_name | text | |

## Requirements

### Requirement: Password length
Passwords MUST be at least 10 characters.

#### Scenario: Too short
- **WHEN** a visitor submits a 9-character password
- **THEN** sign-up is rejected

### Requirement: Account lockout
IF sign-in fails three times within 10 minutes, THEN the system MUST lock
the account for 15 minutes.

#### Scenario: Third failure locks
- **GIVEN** an account with 2 failed attempts in the last 10 minutes
- **WHEN** a third attempt fails
- **THEN** the account is locked for 15 minutes

## Flow: Sign Up
1. User enters email and password, or clicks "Sign in with Google"
2. System creates the auth account
3. On first login, system creates a Profile
```

## How a change flows

```
human + cat-author  →  edit bacon/  →  catspec validate  →  commit + push
                                                                 │
CI: catspec validate --strict  →  cat-transpile  →  src/ + purr  →  commit by bot
```

`bacon/` and `cat.config.yaml` are human-owned. `src/` and `purr` are
transpiler-owned and committed, so incremental runs have a baseline and
reviewers see what changed. Humans do not edit `src/`; a fix is a spec
change.

## Status

Working draft, version 0.2. Spec-as-source is unproven at scale (see
[SPEC.md Appendix B](SPEC.md#appendix-b-prior-art-and-position)). The next
milestone is the honest test: take `example/` through twenty real spec
changes with no hand edits to `src/`.

## TODO

- [x] `cat-init` skill
- [x] `cat-author` and `cat-transpile` skills (split from the previous single skill)
- [x] `catspec validate`, `catspec diff`, `catspec transpile` with lint-rule tests and OpenSpec conformance
- [x] Example project passes `catspec validate --strict`
- [x] `index.html` mirrors SPEC.md 0.2
- [x] `docs/design.md` (rationale moved out of `index.html`)
- [ ] `docs/workflow.md`
- [ ] `llms.txt`
- [x] `scripts/lint-docs.sh`: grep for banned terms from GLOSSARY.md, runs in `npm test`
- [x] `catspec verify`: fail when a human commit touched `src/` or `purr`, or the bot touched `bacon/`
- [ ] `transpiler.agent` backend switch (Cursor, Claude Code, Kiro CLI)
- [ ] Publish skills: `npx skills add cat-hq/catspec`
- [ ] GitHub Action `cat-hq/cat-transpile@v1`
- [ ] The twenty-change experiment on `example/`
- [ ] References: `kind: code` (brownfield, read-only) and `kind: spec` (cross-repo), reserved in SPEC.md §7.1
