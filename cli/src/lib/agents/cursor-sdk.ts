import type { AgentBackend } from "./types.js";

/**
 * Cursor Agent SDK, in-process. `@cursor/sdk` is an optional dependency, so
 * it is loaded by name at runtime and typed loosely; TypeScript never
 * resolves the module.
 */
export const cursorSdk: AgentBackend = {
  name: "cursor",
  description: "Cursor Agent SDK (@cursor/sdk, optional dependency). Needs CURSOR_API_KEY.",
  async run(options) {
    const apiKey = options.apiKey ?? process.env["CURSOR_API_KEY"];
    if (!apiKey) {
      return {
        kind: "startup-error",
        message: "CURSOR_API_KEY is not set. Export it or pass --api-key. See https://cursor.com/dashboard/integrations",
        retryable: false,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sdk: any;
    try {
      const moduleName = "@cursor/sdk";
      sdk = await import(moduleName);
    } catch {
      return {
        kind: "startup-error",
        message: "@cursor/sdk is not installed. Run `npm install` in the cli/ package, or set transpiler.agent to claude-code or cursor-cli.",
        retryable: false,
      };
    }
    const onText = options.onText ?? ((t: string) => process.stdout.write(t));
    const { Agent, CursorAgentError } = sdk;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let agent: any;
    try {
      agent = await Agent.create({
        apiKey,
        model: { id: options.model ?? "composer-2.5" },
        local: { cwd: options.cwd },
      });
      const run = await agent.send(options.prompt);
      let text = "";
      for await (const event of run.stream()) {
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text") {
              onText(block.text);
              text += block.text;
            }
          }
        }
      }
      const result = await run.wait();
      if (result.status === "error") return { kind: "run-error", runId: String(result.id) };
      return { kind: "finished", text };
    } catch (err) {
      if (err instanceof CursorAgentError) {
        const e = err as { message: string; isRetryable?: boolean };
        return { kind: "startup-error", message: e.message, retryable: e.isRetryable === true };
      }
      throw err;
    } finally {
      await agent?.[Symbol.asyncDispose]?.();
    }
  },
};
