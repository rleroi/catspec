# CaT — Code as Text

Human-readable specs in, working code out. The `.cat` file is the source of truth; the LLM is the compiler.

## TODO

- [ ] Create a `cat-init` skill — scaffold a new project interactively (ask stack preferences, set up `.cat/` folder, `bacon/system.cat`, GitHub Actions workflow, `.gitignore`, provider profiles)
- [ ] Get the POC working end-to-end (validate → enrich → confirm → transpile loop on a real project) and remove the POC section from `index.html`
- [ ] Update this README to a real one (installation, usage, examples, how it works)
- [ ] Write provider profiles for common stacks (Supabase, Stripe, Resend, Clerk, etc.)
- [ ] Build the CaT CLI (`cat transpile`, `cat validate`, `cat diff`)
- [ ] GitHub Action workflow template that triggers on `bacon/` changes and opens a PR with generated `src/`
- [ ] Incremental transpilation — test the `git diff` + purr file dependency graph in practice
- [ ] Formal `.cat` parser / linter (optional for v0.1 — LLM reads raw text, but useful for editor support and CI)
