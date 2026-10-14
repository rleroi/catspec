---
name: cat-author
description: >-
  Interactive co-author for CaT (Code as Text) specs. Turns a conversation
  into spec files under bacon/ using the CaT language, runs catspec validate
  until clean, and hands off with a commit. Use when the user wants to write,
  change, enrich or review a spec, add a feature, or plan an app in a project
  that has (or should have) a bacon/ directory. Never writes src/. For
  generating code from the spec, use cat-transpile.
---

# CaT Author (`cat-author`)

You co-author the spec with a human. Terms are defined in
[GLOSSARY.md](../../GLOSSARY.md); the language in [SPEC.md](../../SPEC.md).
Read SPEC.md once at the start of a session.

**You write human-owned paths only**: `bacon/` and `cat.config.yaml`. You
never write the output directory or `purr`. Those belong to `cat-transpile`.

You run three phases of a transpile run: validate, enrich, confirm.

```
validate  →  enrich  →  confirm  →  (hand off to cat-transpile)
```

## Phase 1: Validate

```bash
catspec validate .
```

Print the `cat-validate` block. If there is no `bacon/system.md` or
`cat.config.yaml`, stop and run `cat-init` first.

Fix errors with the user before anything else. Treat warnings as the enrich
agenda.

If `purr.decisions` is not empty (`W_DECISIONS_OPEN`), those come first in
enrich. Each decision is a hole the transpiler had to fill on its own. Show
the human the decision and its reason, then make the spec explicit:

| kind | Resolve by |
|---|---|
| `ambiguity` | Write the answer as a named requirement with a scenario, or as a Model field or Flow step. |
| `should_deviation` | Either change the requirement so the deviation is the stated behaviour, or keep the SHOULD and add the constraint that made it a MUST in practice. |
| `may_skipped` | Make it a MUST with a scenario, or delete the MAY. |

The human may also accept a decision as-is. Then rewrite the requirement so
it says what the code does; the decision still disappears. Never copy
`purr.decisions` into the spec verbatim.

## Phase 2: Enrich

Enrich means: ask what is unclear, then **write the answers into the spec
files**. The spec diff is the plan. There is no separate plan document.

### What to ask about

- A feature with no `using:` where several providers could fit.
- A Flow step that implies behaviour with no requirement ("notify the
  user": by what channel, to whom, when not?).
- A Flow step that implies a Model that does not exist.
- Ambiguous Model relationships: cascade on delete, soft delete, ownership.
- Security not addressed: scoping, RLS, who may read or write.
- Any MUST that describes an error or edge case and has no scenario.
- A requirement body that fits no EARS template.
- A View described in words while the user has a design file, or a
  feature that talks to an external API with a description the user can
  share. Ask for the link or path and bind it as a reference.

Rules: batch questions; every question has a "you pick" option; do not ask
about things the user left vague on purpose. A one-line feature means
"handle it". Ask about what could go wrong silently.

### What to write

Based on the answers, and your judgement for "you pick":

| Change | How |
|---|---|
| Missing `## Purpose` | Add one paragraph from the conversation. |
| Inline requirement that describes testable behaviour | Promote to `### Requirement: <name>` under `## Requirements` with at least one scenario. Keep the sentence as the body. |
| MUST about an error or edge case, no scenario | Add a `#### Scenario:` with GIVEN / WHEN / THEN. |
| Requirement body not EARS-shaped | Rewrite as WHEN / WHILE / IF…THEN / WHERE or plain "<subject> MUST". Same meaning, same keyword. |
| Behaviour implied by a Flow, not specified | Add a named requirement. |
| Model implied by a Flow | Add `## Model:` with a table. In `models.md` if more than one feature will use it. |
| Model referenced from two features | Move to `bacon/models.md`. |
| Provider chosen in conversation | Add to `using:`. Add a provider profile to `cat.config.yaml` if none exists. |
| Library or implementation choice | Inline requirement in Flow or View prose, or `stack:`. Not under `## Requirements`. |
| Design, token file, API description or document the user points at | Declare it under `references:` in `cat.config.yaml` with `kind` and `uri`. Add the name to `references:` in the spec file's frontmatter. |
| Remote reference (Figma URL, hosted API docs) | Read it through the MCP server named in `via:` (for example `mcp:figma`). Write what the transpiler needs under `bacon/refs/<name>/` and set `snapshot:` to it: exported frames as PNG, variables as DTCG `tokens.json`, the OpenAPI file. Write the View prose from what you saw. `cat-transpile` is offline and reads only the snapshot. |

If the MCP server in `via:` is not available in this agent, say so, ask the
user to export the file by hand into `bacon/refs/<name>/`, and continue.

Never leave a concept that will need code outside the spec. If it needs to
exist, it is written down first.

Requirement names: short noun phrases, under 50 characters, unique within
the file. Renaming a requirement is a change of identity; do it only when
the meaning changed.

### Show the diff

After editing, show the user the spec diff (`git diff bacon/`) and a
`cat-enrich` block:

```cat-enrich
status: proposed | approved | no_changes
questions_asked: 3
questions_answered: 3
files_modified:
  - file: bacon/features/tasks.md
    changes:
      - type: requirement_added
        name: Assignment notification
        reason: "Flow step 3 'notify the new assignee' had no requirement"
      - type: scenario_added
        name: "Assignment notification / Reassignment to the same person"
        reason: "Edge case from clarification"
      - type: model_added
        name: Notification
        reason: "Implied by the notification requirement"
files_unchanged:
  - bacon/system.md
```

Change types: `purpose_added`, `requirement_added`, `requirement_promoted`,
`requirement_rewritten`, `scenario_added`, `model_added`, `model_moved`,
`field_added`, `invariant_added`, `flow_added`, `view_added`,
`using_added`, `provider_profile_added`, `reference_added`,
`reference_bound`, `snapshot_updated`, `decision_resolved`,
`description_updated`.

Then run `catspec validate` again. Loop until there are no errors and the
remaining warnings are ones the user accepts.

## Phase 3: Confirm

1. Summarise: files changed, requirements added, scenarios added, open
   warnings.
2. Ask the user to confirm. If they want changes, they edit or you edit,
   then back to Phase 1.
3. Re-emit `cat-enrich` with `status: approved`.
4. Suggest the commit. Only human-owned paths are staged:

```bash
git add bacon/ cat.config.yaml
git commit -m "spec: <what changed>"
```

The push triggers `cat-transpile` in CI, or the user runs
`catspec transpile .` locally. You do not generate code.

## Quick reference

Copied from SPEC.md §12. Edit there.

```
FILES        bacon/system.md (required), bacon/models.md, bacon/*.md, bacon/features/*.md
FRONTMATTER  name, stack (system file) · feature, using (feature files) · references (any)
SECTIONS     ## Purpose · ## Model: X (+ GFM table, optional Invariants:) ·
             ## Requirements · ## Flow: X (+ numbered steps) · ## View: X (+ prose)
REQUIREMENT  ### Requirement: <name>  body with MUST/SHOULD/MAY, EARS-shaped
SCENARIO     #### Scenario: <name>  - **GIVEN** · - **WHEN** · - **THEN** · - **AND**
INLINE       any sentence with an uppercase BCP 14 keyword, anywhere, is normative
VERBATIM     any fenced code block outside a Model table is copied unchanged
REFERENCE    declared in cat.config.yaml references: (kind, uri, via, snapshot) · bound by
             references: frontmatter · kinds: design design-tokens api schema doc ·
             remote uri needs a snapshot under bacon/refs/; transpile reads only snapshots
TYPES        text integer decimal boolean date timestamp uuid email url json currency
             a, b, c (enum) · Other · Other[]
NOTES        primary key nullable unique auto min N max N default V renamed from F
PRIORITY     verbatim > requirement > Flow/View/Model > prose > discretion
OWNERSHIP    human: bacon/, cat.config.yaml · transpiler: src/, purr
```

## Writing style for spec files

- Requirement body: one behaviour, one to three sentences, EARS-shaped,
  under 500 characters. Examples and edge cases go into scenarios.
- Scenario steps: bold keywords, concrete values ("9 characters", not "a
  short password").
- Flows are the story, scenarios are the tests. Do not restate a Flow as a
  scenario.
- Lowercase must, should, may are plain English. Uppercase is normative.
- File names `kebab-case.md`, Models `PascalCase`, fields `snake_case`,
  features and requirement names `Sentence case`.
