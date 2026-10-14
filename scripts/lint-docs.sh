#!/usr/bin/env bash
# Greps the docs, skills and CLI source for terms GLOSSARY.md bans.
# Exit 1 on any hit. Run from the repo root: scripts/lint-docs.sh
# Portable ERE (BSD and GNU grep).
set -u
cd "$(dirname "$0")/.."

# Case-insensitive patterns | canonical term.
INSENSITIVE=(
  '\bpin(ned|s)?\b'                   # requirement
  '\bliteral(s)?\b'                   # verbatim block
  '\bcompil(e|er|ed|ation)\b'         # transpile
  '\bfront[- ]matter\b'               # frontmatter
  '\block ?file\b'                     # purr
  '\bprovider entr(y|ies)\b'          # provider profile
  '\bcat-transpiler\b'                # cat-transpile
  '\bcat-result\b'                    # cat-generate
  '\bgherkin (block|fence)'           # scenario
  '\bacceptance criteria\b'           # scenario
  '\bcodebase\b'                      # output
  '\bvendored\b'                      # snapshot
  '\bimport(ed|s)? (a|the) (design|reference|file)\b'  # reference binding
)
# Case-sensitive: "the model" means the LLM; "the Model" is a data entity.
SENSITIVE=(
  '\bthe model\b'                     # LLM / agent / transpiler
)

FILES=$(git ls-files 'GLOSSARY.md' 'SPEC.md' 'README.md' 'index.html' 'docs/*.md' 'skills/**/*.md' 'cli/README.md' 'cli/src/**/*.ts' 'cli/test/**/*.ts')

status=0
check() {
  local flags="$1" pat="$2"
  # Allowed: the glossary's own term table, and URLs containing the word.
  local hits
  hits=$(grep -n $flags -E "$pat" $FILES \
    | grep -vE '^GLOSSARY\.md:[0-9]+:\| \*\*' \
    | grep -vE 'https?://[^ )]*(front-matter|literal|pin)' || true)
  if [ -n "$hits" ]; then
    echo "banned term /$pat/:"
    echo "$hits" | sed 's/^/  /'
    status=1
  fi
}

for pat in "${INSENSITIVE[@]}"; do check "-i" "$pat"; done
for pat in "${SENSITIVE[@]}"; do check "" "$pat"; done

if [ "$status" -eq 0 ]; then
  echo "lint-docs: clean"
fi
exit "$status"
