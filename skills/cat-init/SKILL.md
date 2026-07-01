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

You scaffold **new** CaT projects so humans can author `bacon/*.md` and run the transpiler skill later. **Spec is source of truth**; `src/` is generated (often gitignored).

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
| `cat.config.yaml` | Transpiler version, model, strategy, output, retries, and one `providers.<key>` entry per selected provider |
| `bacon/system.md` | Required `name:` + `stack:` frontmatter + description (see [index.html](../../index.html) in repo root) |
| `.github/workflows/transpile.yml` | CI on `bacon/**` and `cat.config.yaml`; scaffold check until CLI exists |

**Optional**

- `bacon/features/.gitkeep` — only create if you also create `bacon/features/`; keeps the directory in git until the first feature file is added.

## Provider entry rules

Every generated `providers.<key>` entry **must** include:

- `name` — exact string used in `using:` in spec files (e.g. `Supabase Auth`)
- `category` — short slug (`authentication`, `database`, `payments`, `email`, …)
- `capabilities` — list of short capability strings
- `env` — list of env var names (no secrets)
- `package` — npm package name when applicable (omit key if none)

Optional: `session`, `storage`, or other key-value hints for idiomatic usage. Include when it helps the transpiler make better decisions; omit when there's nothing meaningful to say.

**Clerk + Supabase:** If both selected, add both entries; `system.md`'s `stack:` should list Clerk for auth and Supabase for database. Do not duplicate the Supabase Auth entry if using Clerk only.

**No provider selected for a layer:** Omit that entry; `system.md` should still declare the stack truthfully (LLM may warn per cat-transpiler).

## `.gitignore`

Append the **CaT block** from [templates.md](templates.md). Merge with existing `.gitignore`: do not duplicate lines; preserve user rules.

## After writes

1. Show a short tree of created/changed files.
2. Remind: commit `bacon/` and `cat.config.yaml`; `src/` and `purr` are usually ignored until first transpile.

## Verification checklist (required)

Before finishing, confirm:

- [ ] `bacon/system.md` exists and has `name:` and `stack:` in its frontmatter
- [ ] `cat.config.yaml` exists with `version`, `transpiler` (model, strategy, output, retries), and one `providers.<key>` entry per selected provider
- [ ] `.github/workflows/transpile.yml` exists and triggers on `bacon/**` (and `cat.config.yaml` per template)
- [ ] Every enabled provider has a `providers.<key>` entry in `cat.config.yaml` and its `name` matches what you'll document for `using:`
- [ ] `.gitignore` includes ignores for `src/`, `.env*`, `purr`, and common Node/Next artifacts from the template block (merged, not duplicated)

## Handoff — next steps for the user

Tell the user to:

1. Add feature specs under `bacon/` (e.g. `auth.md`, `models.md`, `features/*.md`).
2. Run the **cat-transpiler** skill: validate → enrich → confirm → transpile (see [skills/cat-transpiler/SKILL.md](../cat-transpiler/SKILL.md)).
3. When the `cat` CLI exists, extend `.github/workflows/transpile.yml` with `cat validate` / `cat transpile` and PR creation.

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
