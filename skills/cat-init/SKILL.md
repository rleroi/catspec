---
name: cat-init
description: >-
  Scaffolds a new CaT (Code as Text) project interactively: stack and provider
  preferences, `cat.config.yaml`, `bacon/system.md`,
  `.github/workflows/transpile.yml`, and `.gitignore` updates. Use when the user
  asks to init, bootstrap, or create a new CaT project; to add `bacon/` and
  `cat.config.yaml` to an empty repo; or when setting up the GitHub Action for
  bacon-driven transpile.
---

# CaT Init (`cat-init`)

You scaffold **new** CaT projects so humans can author `bacon/*.md` with `cat-author` and generate code with `cat-transpile` later. **The spec is the source of truth.** `bacon/` and `cat.config.yaml` are human-owned; `src/` and `purr` are transpiler-owned and committed. Terms: [GLOSSARY.md](../../GLOSSARY.md).

## Before you start

1. Read [templates.md](templates.md) for exact file bodies to create.
2. If `cat.config.yaml` or `bacon/system.md` already exists, **stop** and ask whether to merge, skip, or abort — never overwrite without explicit confirmation.
3. Prefer **AskQuestion** for batches of choices; each batch must include a **“Use defaults”** (or “Just pick for me”) option.

## Default stack (POC baseline)

When the user picks defaults:

| Key | Value |
|-----|-------|
| framework | Next.js (App Router) |
| language | TypeScript |
| database | Supabase |
| auth | Supabase Auth |
| styling | Tailwind + shadcn/ui |
| deploy | Vercel |
| transpiler model | `claude-sonnet-4` (placeholder string in config; user may change) |

## Interactive flow

Execute in order. Combine questions into **one AskQuestion** where possible.

### Step 1 — Target and safety

- Confirm repo root (current workspace or path user gives).
- If `bacon/system.md` or `cat.config.yaml` already exists, **stop** and ask the user to choose:
  - **Skip existing files** — only create files that are missing; never overwrite.
  - **Overwrite all** — replace every scaffold file with fresh generated content.
  - **Abort** — make no changes.

Default is **skip existing**. Never proceed without an explicit choice.

### Step 2 — System identity

Ask (or infer from folder name):

- **System name** (PascalCase or title; becomes the `name:` frontmatter field).
- **One-paragraph description** (free text below the frontmatter).

If user chose “defaults”, use folder basename as system name and a one-line placeholder description they can edit later.

### Step 3 — Stack

Use **AskQuestion** with options, always including **“Use POC defaults (Next.js + Supabase + …)”**.

Cover: `framework`, `language`, `database`, `auth`, `styling`, `deploy`.

If auth is **Clerk** (not Supabase Auth), still allow **Supabase** as database — note in `system.md`'s `stack:` field for auth accordingly.

### Step 4 — Providers (`using:` targets)

Use **AskQuestion**: multi-select or sequential “include provider?” for:

- Supabase (database) — almost always for POC defaults
- Supabase Auth — pair with Supabase unless user chose Clerk
- Stripe, Resend, Clerk — optional

**Rule:** Add **one entry per selected provider** under the `providers:` key in `cat.config.yaml` — nothing else to create. Entry keys:

| Provider binding name | `providers:` key |
|----------------------|------|
| Supabase | `supabase` |
| Supabase Auth | `supabase-auth` |
| Stripe | `stripe` |
| Resend | `resend` |
| Clerk | `clerk` |

Use the bodies from [templates.md](templates.md). Adjust `package` / `env` if the user's stack is not Next.js (still list canonical env names).

### Step 5 — Transpiler preferences

- `transpiler.model`: string from user or default above.
- `transpiler.strategy`: default `incremental`.
- `transpiler.output`: default `src/`.

### Step 6 — Confirm

Summarize paths to be created/modified. After user confirms, write files.

## Scaffold contract (must create)

| Path | Purpose |
|------|---------|
| `cat.config.yaml` | `version`, `transpiler` (model, strategy, output, retries), one provider profile under `providers.<key>` per selected provider, `references` only if the user has something to bind |
| `bacon/system.md` | Required `name:` + `stack:` frontmatter, `## Purpose`, optional `## Requirements` (see [SPEC.md](../../SPEC.md)) |
| `.github/workflows/transpile.yml` | CI on `bacon/**` and `cat.config.yaml`: `catspec validate --strict`, transpile job commented until secrets exist |
| `.gitattributes` | marks `src/**` and `purr` as generated |
| `CODEOWNERS` | GitHub only; bot identity owns `src/` and `purr` |

**Optional**

- `bacon/features/.gitkeep` — only create if you also create `bacon/features/`; keeps the directory in git until the first feature file is added.

## Provider profile rules

Every generated provider profile (`providers.<key>`) **must** include:

- `name` — exact string used in `using:` in spec files (e.g. `Supabase Auth`)
- `category` — short slug (`authentication`, `database`, `payments`, `email`, …)
- `capabilities` — list of short capability strings
- `env` — list of env var names (no secrets)
- `package` — npm package name when applicable (omit key if none)

Optional: `session`, `storage`, or other key-value hints for idiomatic usage. Include when it helps the transpiler make better decisions; omit when there's nothing meaningful to say.

**Clerk + Supabase:** If both selected, add both profiles; `system.md`'s `stack:` should list Clerk for auth and Supabase for database. Do not duplicate the Supabase Auth profile if using Clerk only.

**No provider selected for a layer:** Omit that profile; `system.md` should still declare the stack truthfully (`catspec validate` warns with `W_NO_PROVIDER_PROFILE`).

## `.gitignore`, `.gitattributes`, `CODEOWNERS`

Append the **CaT block** from [templates.md](templates.md) to `.gitignore`. Merge with an existing file: do not duplicate lines; preserve user rules. Never add `src/` or `purr` to `.gitignore`; both are committed.

Create `.gitattributes` from the template (merge if one exists). Create `CODEOWNERS` only for GitHub repos.

## After writes

1. Show a short tree of created/changed files.
2. Remind: commit `bacon/`, `cat.config.yaml`, the workflow and attribute files. `src/` and `purr` appear after the first transpile and are committed by it.

## Verification checklist (required)

Before finishing, confirm:

- [ ] `bacon/system.md` exists with `name:` and `stack:` in its frontmatter and a `## Purpose` section
- [ ] `cat.config.yaml` exists with `version: 0.2`, `transpiler` (model, strategy, output, retries), and one provider profile per selected provider
- [ ] `.github/workflows/transpile.yml` exists, triggers on `bacon/**` and `cat.config.yaml`, runs `catspec validate --strict`
- [ ] `.gitattributes` marks `src/**` and `purr` as generated
- [ ] Every enabled provider has a profile whose `name` matches what you'll document for `using:`
- [ ] `.gitignore` has the template block merged, and does **not** ignore `src/` or `purr`
- [ ] `catspec validate .` passes (run it if the CLI is available: `npx -y @catspec/cli validate .`)

## Handoff — next steps for the user

Tell the user to:

1. Run the **cat-author** skill to write feature specs under `bacon/` (see [skills/cat-author/SKILL.md](../cat-author/SKILL.md)). It validates, enriches, confirms, and ends with a commit.
2. Push. CI runs `catspec validate`. Once the transpile job is enabled, **cat-transpile** regenerates `src/` and commits it (see [skills/cat-transpile/SKILL.md](../cat-transpile/SKILL.md)). Locally: `catspec transpile .`.

## Structured completion (optional)

Emit once at the end for tooling:

```cat-init
status: success | partial | aborted
root: .
files_created:
  - cat.config.yaml
  - bacon/system.md
  - .github/workflows/transpile.yml
providers_written:
  - supabase
  - supabase-auth
gitignore: updated | unchanged | skipped
```
