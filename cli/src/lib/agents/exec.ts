import { spawn } from "node:child_process";
import type { AgentRunOptions, TranspileOutcome } from "./types.js";

export interface ExecSpec {
  readonly bin: string;
  readonly args: readonly string[];
  readonly env?: NodeJS.ProcessEnv;
  /** Prompt is written to stdin when true, otherwise it must be in `args`. */
  readonly promptOnStdin: boolean;
}

/** Runs a headless agent CLI, streams stdout, maps exit codes to an outcome. */
export async function execAgent(spec: ExecSpec, options: AgentRunOptions): Promise<TranspileOutcome> {
  const onText = options.onText ?? ((t: string) => process.stdout.write(t));
  return new Promise((resolve) => {
    let text = "";
    let stderr = "";
    let child;
    try {
      child = spawn(spec.bin, [...spec.args], {
        cwd: options.cwd,
        env: { ...process.env, ...spec.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      resolve({ kind: "startup-error", message: String(err), retryable: false });
      return;
    }
    child.on("error", (err: NodeJS.ErrnoException) => {
      const message =
        err.code === "ENOENT"
          ? `\`${spec.bin}\` is not installed or not on PATH.`
          : err.message;
      resolve({ kind: "startup-error", message, retryable: false });
    });
    child.stdout.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      text += s;
      onText(s);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ kind: "finished", text });
      else resolve({ kind: "run-error", runId: `${spec.bin} exit ${code}${stderr ? `: ${stderr.trim().slice(0, 400)}` : ""}` });
    });
    if (spec.promptOnStdin) child.stdin.end(options.prompt);
    else child.stdin.end();
  });
}
