# cat-init — file templates

Copy these into the target repo, replacing `{{PLACEHOLDERS}}`.

## `.cat/config.yaml`

```yaml
version: 0.1

transpiler:
  model: "{{TRANSPILER_MODEL}}"
  strategy: incremental
  output: "src/"
  retries: 2

providers:
  path: ".cat/providers/"
```

## `bacon/system.cat`

```text
System: {{SYSTEM_NAME}}

{{SYSTEM_DESCRIPTION}}

Stack:
  framework:  {{STACK_FRAMEWORK}}
  language:   {{STACK_LANGUAGE}}
  database:   {{STACK_DATABASE}}
  auth:       {{STACK_AUTH}}
  styling:    {{STACK_STYLING}}
  deploy:     {{STACK_DEPLOY}}
```

## `.github/workflows/transpile.yml`

```yaml
name: CaT transpile

on:
  push:
    branches: [main, master]
    paths:
      - "bacon/**"
      - ".cat/**"
  pull_request:
    paths:
      - "bacon/**"
      - ".cat/**"

jobs:
  cat-scaffold-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Require CaT layout
        run: |
          test -f bacon/system.cat
          test -f .cat/config.yaml
          grep -q "^System:" bacon/system.cat
          grep -q "^Stack:" bacon/system.cat
          echo "CaT scaffold OK"

      # When `cat` CLI is available, replace with:
      # - run: cat validate
      # - run: cat transpile
      # - uses: peter-evans/create-pull-request@v6
```

## `.gitignore` — append block

```gitignore
# CaT — generated / local (keep bacon/ and .cat/ committed except secrets)
src/*
!src/.gitkeep
.env
.env.local
.env.*.local
.cat/purr
node_modules/
.next/
out/
dist/
build/
*.log
```

If you want an empty `src/` tracked before first transpile, create `src/.gitkeep` — the negation above will preserve it. Otherwise omit `src/.gitkeep` entirely and `src/` will be fully ignored until generated.

## `.cat/providers/supabase.yaml`

```yaml
name: Supabase
category: database
capabilities:
  - postgres
  - realtime
  - storage
  - edge-functions
defaults:
  client: "@supabase/supabase-js"
  ssr: "@supabase/ssr"
requires:
  env:
    - NEXT_PUBLIC_SUPABASE_URL
    - NEXT_PUBLIC_SUPABASE_ANON_KEY
  packages:
    - "@supabase/supabase-js"
    - "@supabase/ssr"
```

## `.cat/providers/supabase-auth.yaml`

```yaml
name: Supabase Auth
category: authentication
capabilities:
  - email-password
  - oauth
  - magic-link
defaults:
  session: jwt
  storage: cookie
requires:
  env:
    - NEXT_PUBLIC_SUPABASE_URL
    - NEXT_PUBLIC_SUPABASE_ANON_KEY
  packages:
    - "@supabase/supabase-js"
    - "@supabase/ssr"
```

## `.cat/providers/stripe.yaml`

```yaml
name: Stripe
category: payments
capabilities:
  - checkout
  - customer-portal
  - webhooks
requires:
  env:
    - STRIPE_SECRET_KEY
    - STRIPE_WEBHOOK_SECRET
    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  packages:
    - stripe
```

## `.cat/providers/resend.yaml`

```yaml
name: Resend
category: email
capabilities:
  - transactional-email
requires:
  env:
    - RESEND_API_KEY
  packages:
    - resend
```

## `.cat/providers/clerk.yaml`

```yaml
name: Clerk
category: authentication
capabilities:
  - email-password
  - oauth
  - organizations
requires:
  env:
    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    - CLERK_SECRET_KEY
  packages:
    - "@clerk/nextjs"
```
