import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { verify } from "../src/lib/verify.js";
import { CONFIG_YAML, SYSTEM_MD } from "./helpers.js";

const run = promisify(execFile);

async function git(cwd: string, args: string[], author?: { name: string; email: string }) {
  const env = { ...process.env };
  if (author) {
    env["GIT_AUTHOR_NAME"] = author.name;
    env["GIT_AUTHOR_EMAIL"] = author.email;
    env["GIT_COMMITTER_NAME"] = author.name;
    env["GIT_COMMITTER_EMAIL"] = author.email;
  }
  await run("git", args, { cwd, env });
}

const HUMAN = { name: "Ada", email: "ada@example.com" };
const BOT = { name: "cat-transpile-bot", email: "cat-transpile-bot@users.noreply.github.com" };

async function commit(cwd: string, files: Record<string, string>, who: { name: string; email: string }, msg: string) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(cwd, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  await git(cwd, ["add", "-A"]);
  await git(cwd, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", msg], who);
}

async function withRepo<T>(fn: (cwd: string) => Promise<T>): Promise<T> {
  const cwd = await mkdtemp(join(tmpdir(), "catspec-verify-"));
  try {
    await git(cwd, ["init", "-q", "-b", "master"]);
    await commit(cwd, { "bacon/system.md": SYSTEM_MD, "cat.config.yaml": CONFIG_YAML }, HUMAN, "init");
    return await fn(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

describe("catspec verify (ownership, SPEC.md §11)", () => {
  it("passes when humans touch bacon/ and the bot touches src/ and purr", async () => {
    await withRepo(async (cwd) => {
      await commit(cwd, { "bacon/auth.md": "## Purpose\n\nAuth.\n" }, HUMAN, "spec: auth");
      await commit(cwd, { "src/auth.ts": "// generated\n", purr: "last_transpiled_commit: x\n" }, BOT, "transpile");
      const r = await verify(cwd);
      expect(r.status).toBe("pass");
      expect(r.commitsChecked).toBe(3);
      expect(r.violations).toEqual([]);
    });
  });

  it("fails when a human commit touches src/ or purr", async () => {
    await withRepo(async (cwd) => {
      await commit(cwd, { "src/auth.ts": "// hand edit\n" }, HUMAN, "hotfix in src");
      const r = await verify(cwd);
      expect(r.status).toBe("fail");
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0]?.kind).toBe("human_touched_output");
      expect(r.violations[0]?.files).toEqual(["src/auth.ts"]);
    });
  });

  it("fails when a bot commit touches bacon/ or cat.config.yaml", async () => {
    await withRepo(async (cwd) => {
      await commit(cwd, { "bacon/auth.md": "## Purpose\n\nBot wrote this.\n" }, BOT, "transpile");
      const r = await verify(cwd);
      expect(r.violations.map((v) => v.kind)).toEqual(["bot_touched_spec"]);
    });
  });

  it("checks only commits after --base, and honours transpiler.output and transpiler.bot", async () => {
    await withRepo(async (cwd) => {
      await commit(cwd, { "app/x.ts": "// hand edit before base\n" }, HUMAN, "old");
      const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd });
      const base = stdout.trim();
      const cfg = CONFIG_YAML.replace("output: src/", "output: app/\n  bot: robo");
      await commit(cwd, { "cat.config.yaml": cfg }, HUMAN, "config");
      await commit(cwd, { "app/y.ts": "// generated\n" }, { name: "robo", email: "robo@ci" }, "transpile");
      await commit(cwd, { "app/z.ts": "// hand edit\n" }, HUMAN, "oops");
      const r = await verify(cwd, { base });
      expect(r.bot).toBe("robo");
      expect(r.output).toBe("app/");
      expect(r.commitsChecked).toBe(3);
      expect(r.violations.map((v) => v.subject)).toEqual(["oops"]);
    });
  });
});
