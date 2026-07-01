# CaT — Code as Text

Human-readable specs in, working code out. The spec file is the source of truth; the LLM is the compiler.

## TODO

- [x] Create a `cat-init` skill — scaffold a new project interactively (ask stack preferences, set up `cat.config.yaml`, `bacon/system.md`, GitHub Actions workflow, `.gitignore`, provider entries). Implemented: [skills/cat-init/SKILL.md](skills/cat-init/SKILL.md) and [skills/cat-init/templates.md](skills/cat-init/templates.md).
- [x] Get the POC working end-to-end (validate → enrich → confirm → transpile loop on a real project) — ran on `example/`, found and fixed a spec/code drift (undocumented `Notification` model) and a real build error (implicit-`any` cookie params), `npm run build` passes
- [ ] Update this README to a real one (installation, usage, examples, how it works)
- [ ] Write provider entries for common stacks (Supabase, Stripe, Resend, Clerk, etc.)
- [x] Build the CaT CLI (`cat validate`, `cat diff`, `cat transpile`) — see [cli/](cli/), `validate`/`diff` are deterministic and tested against fixtures + `example/`; `transpile` shells out to a Cursor agent via `@cursor/sdk`
- [ ] Publish both skills (`cat-init` + `cat-transpiler`) so users can install to Cursor, Claude Code, and 40+ agents in one command: `npx skills add cat-hq/catspec`
- [ ] GitHub Action workflow template that triggers on `bacon/` changes and opens a PR with generated `src/`
- [ ] Publish the GitHub Action to the Marketplace so users can add it to any repo with the standard `uses: cat-hq/cat-transpile@v1` syntax (requires separate repo)
- [x] Incremental transpilation — `cat diff` implements the `git diff` + purr file dependency graph, tested against fixtures with cascading shared-model changes
- [ ] Formal spec parser / linter (optional for v0.1 — `cli/src/lib/spec.ts` is a lightweight regex-based parser for the CLI's own checks, not a full AST/editor-support parser)


