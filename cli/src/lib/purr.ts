import { readFile, writeFile } from "node:fs/promises";
import yaml from "js-yaml";

export interface MigrationEntry {
  readonly file: string;
  readonly depends_on?: readonly string[];
}

export interface PurrFileEntry {
  readonly content_hash?: string;
  readonly outputs?: readonly string[];
  readonly dependencies?: readonly string[];
  readonly migrations?: readonly MigrationEntry[];
}

export interface Purr {
  last_transpiled_commit: string | null;
  last_transpiled_at?: string;
  [specPath: string]: unknown;
}

export async function loadPurr(purrPath: string): Promise<Purr | null> {
  let raw: string;
  try {
    raw = await readFile(purrPath, "utf8");
  } catch {
    return null;
  }
  const parsed = yaml.load(raw);
  return (parsed ?? { last_transpiled_commit: null }) as Purr;
}

export async function writePurr(purrPath: string, purr: Purr): Promise<void> {
  await writeFile(purrPath, yaml.dump(purr, { lineWidth: 100 }), "utf8");
}

export function getFileEntry(purr: Purr, specPath: string): PurrFileEntry | undefined {
  const entry = purr[specPath];
  if (!entry || typeof entry !== "object") return undefined;
  return entry as PurrFileEntry;
}
