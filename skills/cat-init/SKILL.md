---
name: cat-init
description: >-
  Scaffolds a new CaT (Code as Text) project interactively: stack and provider
  preferences, `.cat/` config, `bacon/system.cat`, `.cat/providers/` profiles,
  `.github/workflows/transpile.yml`, and `.gitignore` updates. Use when the user
  asks to init, bootstrap, or create a new CaT project; to add `bacon/` and `.cat/`
  to an empty repo; or when setting up the GitHub Action for bacon-driven transpile.
---

# CaT Init (`cat-init`)

You scaffold **new** CaT projects so humans can author `bacon/*.cat` and run the transpiler skill later. **Spec is source of truth**; `src/` is generated (often gitignored).

## Before you start

1. Read [templates.md](templates.md) for exact file bodies to create.
2. If `.cat/` or `bacon/system.cat` already exists, **stop** and ask whether to merge, skip, or abort — never overwrite without explicit confirmation.
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
- If `bacon/system.cat` or `.cat/config.yaml` already exists, **stop** and ask the user to choose:
  - **Skip existing files** — only create files that are missing; never overwrite.
  - **Overwrite all** — replace every scaffold file with fresh generated content.
  - **Abort** — make no changes.

Default is **skip existing**. Never proceed without an explicit choice.

### Step 2 — System identity

Ask (or infer from folder name):

- **System name** (PascalCase or title; becomes `System:` line).
- **One-paragraph description** (free text for under `System:`).

If user chose “defaults”, use folder basename as system name and a one-line placeholder description they can edit later.

### Step 3 — Stack

Use **AskQuestion** with options, always including **“Use POC defaults (Next.js + Supabase + …)”**.

Cover: `framework`, `language`, `database`, `auth`, `styling`, `deploy`.

If auth is **Clerk** (not Supabase Auth), still allow **Supabase** as database — note in `system.cat` Stack line for auth accordingly.

### Step 4 — Providers (`using:` targets)

Use **AskQuestion**: multi-select or sequential “include provider?” for:

- Supabase (database) — almost always for POC defaults
- Supabase Auth — pair with Supabase unless user chose Clerk
- Stripe, Resend, Clerk — optional

**Rule:** Create **one YAML file per profile** under `.cat/providers/` only for providers the user enabled. File naming:

| Provider binding name | File |
|----------------------|------|
| Supabase | `supabase.yaml` |
| Supabase Auth | `supabase-auth.yaml` |
| Stripe | `stripe.yaml` |
| Resend | `resend.yaml` |
| Clerk | `clerk.yaml` |

Use the bodies from [templates.md](templates.md). Adjust `requires.env` / `packages` if the user’s stack is not Next.js (still list canonical env names; add a short comment in YAML only if valid YAML comments).

### Step 5 — Transpiler preferences

- `transpiler.model`: string from user or default above.
- `transpiler.strategy`: default `incremental`.
- `transpiler.output`: default `src/`.

### Step 6 — Confirm

Summarize paths to be created/modified. After user confirms, write files.

## Scaffold contract (must create)

| Path | Purpose |
|------|---------|
| `.cat/config.yaml` | Transpiler version, model, strategy, output, retries, providers path |
| `bacon/system.cat` | Required `System:` + description + `Stack:` block (see [index.html](../../index.html) in repo root) |
| `.github/workflows/transpile.yml` | CI on `bacon/**` and `.cat/**`; scaffold check until CLI exists |
| `.cat/providers/*.yaml` | One file per selected provider; min fields below |

**Optional**

- `bacon/features/.gitkeep` — only create if you also create `bacon/features/`; keeps the directory in git until the first feature file is added.

## Provider profile rules

Every generated profile **must** include:

- `name` — exact string used in `using:` in `.cat` files (e.g. `Supabase Auth`)
- `category` — short slug (`authentication`, `database`, `payments`, `email`, …)
- `capabilities` — list of short capability strings
- `requires.env` — list of env var names (no secrets)
- `requires.packages` — npm package names when applicable (omit key if none)

Optional: `defaults:` — key-value hints for idiomatic usage (e.g. preferred client package, session storage). Include when it helps the transpiler make better decisions; omit when there's nothing meaningful to say.

**Clerk + Supabase:** If both selected, both profiles are written; `system.cat` Stack should list Clerk for auth and Supabase for database. Do not duplicate Supabase Auth profile if using Clerk only.

**No provider selected for a layer:** Omit that profile file; `system.cat` should still declare the stack truthfully (LLM may warn per cat-transpiler).

## `.gitignore`

Append the **CaT block** from [templates.md](templates.md). Merge with existing `.gitignore`: do not duplicate lines; preserve user rules.

## After writes

1. Show a short tree of created/changed files.
2. Remind: commit `bacon/`, `.cat/config.yaml`, and `.cat/providers/`; `src/` and `.cat/purr` are usually ignored until first transpile.

## Verification checklist (required)

Before finishing, confirm:

- [ ] `bacon/system.cat` exists and contains `System:` on a line and `Stack:` with indented keys
- [ ] `.cat/config.yaml` exists with `version`, `transpiler` (model, strategy, output, retries), and `providers.path`
- [ ] `.github/workflows/transpile.yml` exists and triggers on `bacon/**` (and `.cat/**` per template)
- [ ] Every enabled provider has a matching file under `.cat/providers/` and `name` matches what you’ll document for `using:`
- [ ] `.gitignore` includes ignores for `src/`, `.env*`, `.cat/purr`, and common Node/Next artifacts from the template block (merged, not duplicated)

## Handoff — next steps for the user

Tell the user to:

1. Add feature specs under `bacon/` (e.g. `auth.cat`, `models.cat`, `features/*.cat`).
2. Run the **cat-transpiler** skill: validate → enrich → confirm → transpile (see [skills/cat-transpiler/SKILL.md](../cat-transpiler/SKILL.md)).
3. When the `cat` CLI exists, extend `.github/workflows/transpile.yml` with `cat validate` / `cat transpile` and PR creation.

## Structured completion (optional)

Emit once at the end for tooling:

```cat-init
status: success | partial | aborted
root: .
files_created:
  - .cat/config.yaml
  - bacon/system.cat
  - .github/workflows/transpile.yml
  - .cat/providers/supabase.yaml
  - .cat/providers/supabase-auth.yaml
providers_written:
  - supabase
  - supabase-auth
gitignore: updated | unchanged | skipped
```
