/**
 * SPEC.md §1.2: a spec file that has a `## Requirements` section, with its
 * CaT-only constructs removed, MUST be a valid OpenSpec `spec.md`.
 *
 * This test projects each TaskFlow fixture spec file to its OpenSpec view and runs
 * the real `openspec validate --specs` on the result. Non-strict on purpose:
 * OpenSpec warns on bodies that use SHOULD without SHALL/MUST, and CaT keeps
 * SHOULD as a documented deviation.
 */
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { findMarkdownFiles } from "../src/lib/discover.js";

const run = promisify(execFile);
const OPENSPEC = "@fission-ai/openspec@1.14.1";
const EXAMPLE = resolve(__dirname, "fixtures", "taskflow");

/** Keep only `## Purpose` and `## Requirements` (each up to the next `## ` heading). */
export function projectToOpenSpec(title: string, raw: string): string | null {
  const body = matter(raw).content.split("\n");
  const keep: string[] = [];
  let keeping = false;
  let sawRequirements = false;
  for (const line of body) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      const isPurpose = /^##\s+Purpose\s*$/i.test(line);
      const isReq = /^##\s+Requirements\s*$/i.test(line);
      keeping = isPurpose || isReq;
      if (isReq) sawRequirements = true;
    }
    if (keeping) keep.push(line);
  }
  if (!sawRequirements) return null;
  return `# ${title} Specification\n\n${keep.join("\n").trim()}\n`;
}

describe("OpenSpec conformance of the TaskFlow fixture", () => {
  it("every fixture spec file with a Requirements section validates as an OpenSpec spec", async () => {
    const files = await findMarkdownFiles(join(EXAMPLE, "bacon"));
    const root = await mkdtemp(join(tmpdir(), "catspec-openspec-"));
    try {
      let projected = 0;
      for (const abs of files) {
        const raw = await readFile(abs, "utf8");
        const fm = matter(raw).data as Record<string, unknown>;
        const title = String(fm["feature"] ?? fm["name"] ?? "spec");
        const view = projectToOpenSpec(title, raw);
        if (view === null) continue;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const dir = join(root, "openspec", "specs", slug);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "spec.md"), view, "utf8");
        projected++;
      }
      expect(projected).toBeGreaterThan(0);

      const { stdout, stderr } = await run("npx", ["-y", OPENSPEC, "validate", "--specs", "--no-interactive"], {
        cwd: root,
        env: { ...process.env, OPENSPEC_TELEMETRY: "0", FORCE_COLOR: "0" },
      }).catch((e: { stdout?: string; stderr?: string; code?: number }) => {
        throw new Error(`openspec validate failed (exit ${e.code})\n${e.stdout ?? ""}\n${e.stderr ?? ""}`);
      });
      expect(stdout + stderr).not.toMatch(/error/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);
});
