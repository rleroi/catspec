import { execAgent } from "./exec.js";
import type { AgentBackend } from "./types.js";

/**
 * Claude Code headless: `claude -p` reads the prompt from stdin. Permissions
 * are bypassed because the run is unattended and cat-transpile's contract
 * (never edit bacon/ or cat.config.yaml) is enforced by `catspec verify`,
 * not by the agent's permission prompts.
 */
export const claudeCode: AgentBackend = {
  name: "claude-code",
  description: "Claude Code CLI, `claude -p`. Needs `claude` on PATH and a logged-in account or ANTHROPIC_API_KEY.",
  run(options) {
    const args = ["-p", "--output-format", "text", "--dangerously-skip-permissions"];
    if (options.model) args.push("--model", options.model);
    const env: NodeJS.ProcessEnv = {};
    if (options.apiKey) env["ANTHROPIC_API_KEY"] = options.apiKey;
    return execAgent({ bin: options.bin ?? "claude", args, env, promptOnStdin: true }, options);
  },
};
