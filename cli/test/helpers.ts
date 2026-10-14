import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { validate, type ValidateOptions, type ValidateResult } from "../src/lib/validate.js";

export const SYSTEM_MD = `---
name: Fixture
stack:
  framework: Next.js
  language: TypeScript
  database: Supabase
  auth: Supabase Auth
  styling: Tailwind
  deploy: Vercel
---

## Purpose

Fixture project.
`;

export const CONFIG_YAML = `version: 0.2
transpiler:
  model: test
  strategy: incremental
  output: src/
  retries: 0
providers:
  supabase:
    name: Supabase
    package: "@supabase/supabase-js"
`;

/**
 * Write a throwaway CaT project and validate it. `files` are relative to the
 * project root; a default system.md and cat.config.yaml are added unless
 * overridden. Returns the result plus a disposer.
 */
export async function validateProject(
  files: Record<string, string>,
  options: ValidateOptions = {},
): Promise<ValidateResult> {
  const root = await mkdtemp(join(tmpdir(), "catspec-fixture-"));
  const all: Record<string, string> = {
    "bacon/system.md": SYSTEM_MD,
    "cat.config.yaml": CONFIG_YAML,
    ...files,
  };
  try {
    for (const [rel, content] of Object.entries(all)) {
      const abs = join(root, rel);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
    }
    return await validate(root, options);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function codes(result: ValidateResult): string[] {
  return [...result.errors, ...result.warnings].map((i) => i.code);
}

export function count(result: ValidateResult, code: string): number {
  return codes(result).filter((c) => c === code).length;
}
