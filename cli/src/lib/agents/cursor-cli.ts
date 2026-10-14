import { execAgent } from "./exec.js";
import type { AgentBackend } from "./types.js";

/** Cursor CLI headless: `cursor-agent -p --force --trust`. Prompt on stdin. */
export const cursorCli: AgentBackend = {
  name: "cursor-cli",
  description: "Cursor CLI, `cursor-agent -p`. Needs `cursor-agent` on PATH and CURSOR_API_KEY or a login.",
  run(options) {
    const args = ["-p", "--force", "--trust", "--output-format", "text", "--workspace", options.cwd];
    if (options.model) args.push("--model", options.model);
    const env: NodeJS.ProcessEnv = {};
    if (options.apiKey) env["CURSOR_API_KEY"] = options.apiKey;
    return execAgent({ bin: options.bin ?? "cursor-agent", args, env, promptOnStdin: true }, options);
  },
};
