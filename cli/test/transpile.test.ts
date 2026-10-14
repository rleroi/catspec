import { describe, expect, it } from "vitest";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transpile, buildTranspilePrompt, parseStructuredBlocks } from "../src/lib/transpile.js";
import { findAgent, AGENTS } from "../src/lib/agents/index.js";
import { CONFIG_YAML, SYSTEM_MD } from "./helpers.js";

/** A fake agent binary: echoes its argv and stdin as a cat-generate block. */
async function fakeBin(dir: string, exitCode = 0): Promise<string> {
  const bin = join(dir, "fake-agent");
  await writeFile(
    bin,
    `#!/bin/sh\nprompt=$(cat)\necho "ARGS: $*"\necho '\`\`\`cat-generate'\necho "prompt_bytes: \${#prompt}"\necho '\`\`\`'\nexit ${exitCode}\n`,
    "utf8",
  );
  await chmod(bin, 0o755);
  return bin;
}

async function withProject<T>(configExtra: string, fn: (cwd: string) => Promise<T>): Promise<T> {
  const cwd = await mkdtemp(join(tmpdir(), "catspec-transpile-"));
  try {
    await mkdir(join(cwd, "bacon"), { recursive: true });
    await writeFile(join(cwd, "bacon/system.md"), SYSTEM_MD);
    await writeFile(join(cwd, "cat.config.yaml"), CONFIG_YAML.replace("transpiler:\n", `transpiler:\n${configExtra}`));
    return await fn(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

describe("agent backends", () => {
  it("registry knows cursor, cursor-cli and claude-code", () => {
    expect(AGENTS.map((a) => a.name)).toEqual(["cursor", "cursor-cli", "claude-code"]);
    expect(findAgent("Claude-Code")?.name).toBe("claude-code");
    expect(findAgent("nope")).toBeUndefined();
  });

  it("unknown transpiler.agent is a startup error naming the known ones", async () => {
    await withProject("  agent: kiro\n", async (cwd) => {
      const r = await transpile(cwd, { onText: () => {} });
      expect(r.kind).toBe("startup-error");
      if (r.kind === "startup-error") expect(r.message).toMatch(/cursor, cursor-cli, claude-code/);
    });
  });

  it("claude-code: runs `claude -p` with the model from config and the prompt on stdin", async () => {
    await withProject("  agent: claude-code\n", async (cwd) => {
      const bin = await fakeBin(cwd);
      let out = "";
      const r = await transpile(cwd, { bin, onText: (t) => (out += t) });
      expect(r.kind).toBe("finished");
      expect(out).toMatch(/ARGS: -p --output-format text --dangerously-skip-permissions --model test/);
      const blocks = parseStructuredBlocks(out);
      expect(blocks["cat-generate"]).toMatch(/prompt_bytes: [1-9]\d{3,}/);
    });
  });

  it("cursor-cli: --agent overrides config, workspace is the project dir", async () => {
    await withProject("  agent: claude-code\n", async (cwd) => {
      const bin = await fakeBin(cwd);
      let out = "";
      const r = await transpile(cwd, { agent: "cursor-cli", model: "sonnet-4", bin, onText: (t) => (out += t) });
      expect(r.kind).toBe("finished");
      expect(out).toMatch(new RegExp(`ARGS: -p --force --trust --output-format text --workspace ${cwd} --model sonnet-4`));
    });
  });

  it("non-zero exit is a run-error; missing binary is a startup-error", async () => {
    await withProject("  agent: claude-code\n", async (cwd) => {
      const bin = await fakeBin(cwd, 3);
      const r = await transpile(cwd, { bin, onText: () => {} });
      expect(r.kind).toBe("run-error");
      const missing = await transpile(cwd, { bin: join(cwd, "does-not-exist"), onText: () => {} });
      expect(missing.kind).toBe("startup-error");
    });
  });

  it("prompt ends with the headless contract", () => {
    const p = buildTranspilePrompt("SKILL", "/p");
    expect(p.startsWith("SKILL")).toBe(true);
    expect(p).toMatch(/Do not edit\n\nbacon\/ or cat\.config\.yaml, and do not ask questions\./);
  });
});
