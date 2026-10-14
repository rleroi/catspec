import { join } from "node:path";
import { loadCatConfig } from "./config.js";
import { commitExists, listCommits, rootCommit, type CommitInfo } from "./git.js";
import { loadPurr } from "./purr.js";

export const DEFAULT_BOT = "cat-transpile-bot";

export interface VerifyOptions {
  /** Commit or ref to start after. Default: purr.last_transpiled_commit, else the root commit. */
  readonly base?: string;
}

export interface Violation {
  readonly commit: string;
  readonly author: string;
  readonly subject: string;
  readonly kind: "human_touched_output" | "bot_touched_spec";
  readonly files: readonly string[];
}

export interface VerifyResult {
  readonly status: "pass" | "fail";
  readonly base: string | null;
  readonly bot: string;
  readonly output: string;
  readonly commitsChecked: number;
  readonly violations: readonly Violation[];
}

/**
 * Ownership check (SPEC.md §11). Walks commits after `base` and fails when a
 * non-bot commit touches transpiler-owned paths (output dir, purr) or a bot
 * commit touches human-owned paths (bacon/, cat.config.yaml).
 */
export async function verify(projectDir: string, options: VerifyOptions = {}): Promise<VerifyResult> {
  const config = await loadCatConfig(join(projectDir, "cat.config.yaml"));
  const transpiler = (config?.transpiler ?? {}) as Record<string, unknown>;
  const bot = typeof transpiler["bot"] === "string" ? transpiler["bot"] : DEFAULT_BOT;
  const output = normalizeDir(typeof transpiler["output"] === "string" ? transpiler["output"] : "src/");

  let base: string | null = options.base ?? null;
  if (!base) {
    const purr = await loadPurr(join(projectDir, "purr"));
    base = purr?.last_transpiled_commit ?? null;
    if (base && !(await commitExists(projectDir, base))) base = null;
  }
  const range = base ? `${base}..HEAD` : "HEAD";
  if (!base) base = await rootCommit(projectDir);

  const commits = await listCommits(projectDir, range);
  const violations: Violation[] = [];
  for (const c of commits) {
    const isBot = isBotCommit(c, bot);
    const transpilerOwned = c.files.filter((f) => f.startsWith(output) || f === "purr");
    const humanOwned = c.files.filter((f) => f.startsWith("bacon/") || f === "cat.config.yaml");
    if (!isBot && transpilerOwned.length > 0) {
      violations.push({
        commit: c.sha.slice(0, 7),
        author: c.authorName,
        subject: c.subject,
        kind: "human_touched_output",
        files: transpilerOwned,
      });
    }
    if (isBot && humanOwned.length > 0) {
      violations.push({
        commit: c.sha.slice(0, 7),
        author: c.authorName,
        subject: c.subject,
        kind: "bot_touched_spec",
        files: humanOwned,
      });
    }
  }

  return {
    status: violations.length === 0 ? "pass" : "fail",
    base,
    bot,
    output,
    commitsChecked: commits.length,
    violations,
  };
}

function isBotCommit(c: CommitInfo, bot: string): boolean {
  const b = bot.toLowerCase();
  return c.authorName.toLowerCase() === b || c.authorEmail.toLowerCase().startsWith(`${b}@`);
}

function normalizeDir(dir: string): string {
  const d = dir.replace(/^\.\//, "");
  return d.endsWith("/") ? d : `${d}/`;
}
