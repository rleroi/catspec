import { join, relative, sep } from "node:path";
import { commitExists, getChangedFilesSince, getHeadCommit } from "./git.js";
import { getFileEntry, loadPurr, type Purr } from "./purr.js";
import { findMarkdownFiles } from "./discover.js";

export interface DiffResult {
  readonly commit: string | null;
  readonly lastTranspiledCommit: string | null;
  readonly fullTranspileNeeded: boolean;
  readonly reason?: string;
  readonly changedSpecFiles: readonly string[];
  readonly affectedSpecFiles: readonly string[];
  readonly affectedOutputs: readonly string[];
}

export async function diff(projectDir: string): Promise<DiffResult> {
  const purrPath = join(projectDir, "purr");
  const baconDir = join(projectDir, "bacon");
  const commit = await getHeadCommit(projectDir);
  const purr = await loadPurr(purrPath);

  if (!purr || !purr.last_transpiled_commit) {
    const allFiles = (await findMarkdownFiles(baconDir)).map((abs) =>
      relative(projectDir, abs).split(sep).join("/"),
    );
    return {
      commit,
      lastTranspiledCommit: null,
      fullTranspileNeeded: true,
      reason: "No purr file (or no last_transpiled_commit) — this is a first run.",
      changedSpecFiles: allFiles,
      affectedSpecFiles: allFiles,
      affectedOutputs: [],
    };
  }

  const lastCommit = purr.last_transpiled_commit;
  const exists = await commitExists(projectDir, lastCommit);
  if (!exists) {
    const allFiles = (await findMarkdownFiles(baconDir)).map((abs) =>
      relative(projectDir, abs).split(sep).join("/"),
    );
    return {
      commit,
      lastTranspiledCommit: lastCommit,
      fullTranspileNeeded: true,
      reason: `last_transpiled_commit (${lastCommit}) is not reachable from this repo — falling back to a full transpile.`,
      changedSpecFiles: allFiles,
      affectedSpecFiles: allFiles,
      affectedOutputs: [],
    };
  }

  const changed = await getChangedFilesSince(projectDir, lastCommit, "bacon/");

  if (changed.length === 0) {
    return {
      commit,
      lastTranspiledCommit: lastCommit,
      fullTranspileNeeded: false,
      changedSpecFiles: [],
      affectedSpecFiles: [],
      affectedOutputs: [],
    };
  }

  const affected = expandDependents(purr, changed);
  const affectedOutputs = new Set<string>();
  for (const specPath of affected) {
    const entry = getFileEntry(purr, specPath);
    for (const output of entry?.outputs ?? []) affectedOutputs.add(output);
  }

  return {
    commit,
    lastTranspiledCommit: lastCommit,
    fullTranspileNeeded: false,
    changedSpecFiles: changed,
    affectedSpecFiles: [...affected],
    affectedOutputs: [...affectedOutputs],
  };
}

/**
 * A spec file depends on another if its purr entry lists it under `dependencies`.
 * Changing a shared file (e.g. models.md) must also regenerate its dependents.
 */
function expandDependents(purr: Purr, changed: readonly string[]): Set<string> {
  const affected = new Set(changed);
  const specPaths = Object.keys(purr).filter(
    (k) => k !== "last_transpiled_commit" && k !== "last_transpiled_at",
  );

  let grew = true;
  while (grew) {
    grew = false;
    for (const specPath of specPaths) {
      if (affected.has(specPath)) continue;
      const entry = getFileEntry(purr, specPath);
      const deps = entry?.dependencies ?? [];
      if (deps.some((dep) => affected.has(dep))) {
        affected.add(specPath);
        grew = true;
      }
    }
  }
  return affected;
}
