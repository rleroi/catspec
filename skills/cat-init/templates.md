# cat-init — file templates

Copy these into the target repo, replacing `{{PLACEHOLDERS}}`.

## `cat.config.yaml`

```yaml
version: 0.1

transpiler:
  model: "{{TRANSPILER_MODEL}}"
  strategy: incremental
  output: "src/"
  retries: 2

providers:
  {{PROVIDER_KEY}}:
    package: "{{PROVIDER_PACKAGE}}"
```

One `providers.<key>` entry per selected provider — see individual provider
bodies below, which are all merged into this one file's `providers:` map.

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

{{SYSTEM_DESCRIPTION}}
```

## `.github/workflows/transpile.yml`

```yaml
name: CaT transpile

on:
  push:
    branches: [main, master]
    paths:
      - "bacon/**"
      - "cat.config.yaml"
  pull_request:
    paths:
      - "bacon/**"
      - "cat.config.yaml"

jobs:
  cat-scaffold-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Require CaT layout
        run: |
          test -f bacon/system.md
          test -f cat.config.yaml
          grep -q "^name:" bacon/system.md
          grep -q "^stack:" bacon/system.md
          echo "CaT scaffold OK"

      # When `cat` CLI is available, replace with:
      # - run: cat validate
      # - run: cat transpile
      # - uses: peter-evans/create-pull-request@v6
```

## `.gitignore` — append block

```gitignore
# CaT — generated / local (keep bacon/ and cat.config.yaml committed except secrets)
src/*
!src/.gitkeep
.env
.env.local
.env.*.local
purr
node_modules/
.next/
out/
dist/
build/
*.log
```

If you want an empty `src/` tracked before first transpile, create `src/.gitkeep` — the negation above will preserve it. Otherwise omit `src/.gitkeep` entirely and `src/` will be fully ignored until generated.

## Provider entries (merge into `cat.config.yaml`'s `providers:` map)

Each provider is a key under `providers:` in `cat.config.yaml`, not a separate file.

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
