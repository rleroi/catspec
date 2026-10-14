import { readFile } from "node:fs/promises";
import yaml from "js-yaml";

export interface ProviderEntry {
  readonly name?: string;
  readonly [key: string]: unknown;
}

export const REFERENCE_KINDS = ["design", "design-tokens", "api", "schema", "doc"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** One entry under `references:` in cat.config.yaml (SPEC.md §7.1). */
export interface Reference {
  readonly kind?: string;
  readonly uri?: string;
  readonly via?: string;
  readonly snapshot?: string;
  readonly [key: string]: unknown;
}

export interface CatConfig {
  readonly version?: string | number;
  readonly transpiler?: Record<string, unknown>;
  readonly providers?: Readonly<Record<string, ProviderEntry>>;
  readonly references?: Readonly<Record<string, Reference>>;
}

export function isRemoteUri(uri: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(uri.trim());
}

export async function loadCatConfig(configPath: string): Promise<CatConfig | null> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return null;
  }
  const parsed = yaml.load(raw);
  return (parsed ?? {}) as CatConfig;
}

export function findProviderByName(config: CatConfig | null, name: string): ProviderEntry | undefined {
  if (!config?.providers) return undefined;
  const target = name.trim().toLowerCase();
  return Object.values(config.providers).find(
    (entry) => (entry.name ?? "").toString().trim().toLowerCase() === target,
  );
}
