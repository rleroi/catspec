# cat-init — file templates

Copy these into the target repo, replacing `{{PLACEHOLDERS}}`. Terms:
[GLOSSARY.md](../../GLOSSARY.md). Language: [SPEC.md](../../SPEC.md).

## `cat.config.yaml`

```yaml
version: 0.2                     # CaT language version

transpiler:
  model: "{{TRANSPILER_MODEL}}"  # LLM id; the one place "model" means the LLM
  strategy: incremental          # or full
  output: "src/"
  retries: 2

providers:
  {{PROVIDER_KEY}}:
    name: "{{PROVIDER_NAME}}"    # matched by `using:` in spec files
    package: "{{PROVIDER_PACKAGE}}"
```

One provider profile per selected provider under `providers:`. Bodies below.

Add a `references:` map only when the user already has a design, token
file, API description or document to bind. Shape, see SPEC.md §7.1:

```yaml
references:
  {{REFERENCE_KEY}}:
    kind: design               # design | design-tokens | api | schema | doc
    uri: "{{REFERENCE_URI}}"   # local path or URL
    via: mcp:figma             # remote only: MCP server cat-author reads it through
    snapshot: bacon/refs/{{REFERENCE_KEY}}/   # remote only: committed copy cat-transpile reads
```

## `bacon/system.md`

```markdown
---
name: {{SYSTEM_NAME}}
stack:
  framework:  {{STACK_FRAMEWORK}}
  language:   {{STACK_LANGUAGE}}
  database:   {{STACK_DATABASE}}
  auth:       {{STACK_AUTH}}
  styling:    {{STACK_STYLING}}
  deploy:     {{STACK_DEPLOY}}
---

## Purpose

{{SYSTEM_DESCRIPTION}}

## Requirements

### Requirement: {{FIRST_SYSTEM_RULE_NAME}}
{{FIRST_SYSTEM_RULE_BODY}}

#### Scenario: {{FIRST_SYSTEM_RULE_SCENARIO}}
- **WHEN** {{TRIGGER}}
- **THEN** {{OUTCOME}}
```

If the user has no system-wide rule yet, omit `## Requirements` entirely
rather than leaving placeholders.

## `.github/workflows/transpile.yml`

```yaml
name: CaT transpile

on:
  push:
    paths:
      - "bacon/**"
      - "cat.config.yaml"
  pull_request:
    paths:
      - "bacon/**"
      - "cat.config.yaml"

concurrency:
  group: cat-transpile-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # catspec diff needs history back to purr's commit
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx -y @catspec/cli validate . --strict

  # Enable once an agent backend and its API key are configured as repo secrets.
  # Runs only on push (never on PR from a fork), and never when the pusher is the bot.
  # transpile:
  #   needs: validate
  #   if: github.event_name == 'push' && github.actor != 'cat-transpile-bot'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #       with: { fetch-depth: 0 }
  #     - uses: actions/setup-node@v4
  #       with: { node-version: 22 }
  #     - run: npx -y @catspec/cli transpile .
  #       env:
  #         CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
  #     - name: Commit transpiler-owned paths
  #       run: |
  #         git config user.name  "cat-transpile-bot"
  #         git config user.email "cat-transpile-bot@users.noreply.github.com"
  #         git add src/ purr package.json package-lock.json .env.example
  #         git diff --cached --quiet || git commit -m "transpile: $(git rev-parse --short HEAD)"
  #         git push
```

## `.gitattributes`

```gitattributes
# Transpiler-owned paths. Collapsed in GitHub diffs; humans do not edit them.
src/** linguist-generated=true
purr linguist-generated=true
# Snapshots of references are human-owned but bulky. Collapse them in diffs.
bacon/refs/** linguist-generated=true
```

## `CODEOWNERS`

```
# Transpiler-owned paths. Review by the bot identity so human edits to src/ stand out.
/src/   @cat-transpile-bot
/purr   @cat-transpile-bot
```

Replace `@cat-transpile-bot` with the GitHub identity the workflow commits
as. Skip this file if the repo is not on GitHub.

## `.gitignore` — append block

```gitignore
# CaT. bacon/, cat.config.yaml, src/ and purr are all committed.
.env
.env.local
.env.*.local
node_modules/
.next/
out/
dist/
build/
*.log
```

`src/` and `purr` are committed on purpose: incremental transpile needs the
previous output as a baseline, and the purr diff is the review record.

## Provider profiles (merge into `providers:` in `cat.config.yaml`)

Each provider profile is a key under `providers:`, not a separate file.
`name` is what `using:` matches.

### `supabase`

```yaml
supabase:
  name: Supabase
  category: database
  capabilities: [postgres, realtime, storage, edge-functions]
  package: "@supabase/supabase-js"
  ssr_package: "@supabase/ssr"
  env: [NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY]
```

### `supabase-auth`

```yaml
supabase-auth:
  name: Supabase Auth
  category: authentication
  capabilities: [email-password, oauth, magic-link]
  session: jwt
  storage: cookie
  package: "@supabase/supabase-js"
  ssr_package: "@supabase/ssr"
  env: [NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY]
```

### `stripe`

```yaml
stripe:
  name: Stripe
  category: payments
  capabilities: [checkout, customer-portal, webhooks]
  package: stripe
  env: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY]
```

### `resend`

```yaml
resend:
  name: Resend
  category: email
  capabilities: [transactional-email]
  package: resend
  env: [RESEND_API_KEY]
```

### `clerk`

```yaml
clerk:
  name: Clerk
  category: authentication
  capabilities: [email-password, oauth, organizations]
  package: "@clerk/nextjs"
  env: [NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY]
```
