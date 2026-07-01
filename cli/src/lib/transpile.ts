import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CURSOR_TRANSPILER_SKILL_PATH = "skills/cat-transpiler/SKILL.md";

export interface TranspileOptions {
  readonly model?: string;
  readonly apiKey?: string;
}

export type TranspileOutcome =
  | { readonly kind: "finished"; readonly text: string }
  | { readonly kind: "run-error"; readonly runId: string }
  | { readonly kind: "startup-error"; readonly message: string; readonly retryable: boolean };

/**
 * Runs the cat-transpiler skill against `projectDir` via a local Cursor agent.
 * Streams assistant text to stdout as it arrives.
 */
export async function transpile(
  projectDir: string,
  options: TranspileOptions = {},
): Promise<TranspileOutcome> {
  const apiKey = options.apiKey ?? process.env["CURSOR_API_KEY"];
  if (!apiKey) {
    return {
      kind: "startup-error",
      message:
        "CURSOR_API_KEY is not set. Export it or pass --api-key. See https://cursor.com/dashboard/integrations",
      retryable: false,
    };
  }

  let sdk: typeof import("@cursor/sdk");
  try {
    sdk = await import("@cursor/sdk");
  } catch {
    return {
      kind: "startup-error",
      message: "@cursor/sdk is not installed. Run `npm install` in the cli/ package.",
      retryable: false,
    };
  }

  const { Agent, CursorAgentError } = sdk;
  const skillPrompt = await loadTranspilerSkillPrompt();
  const prompt = [
    skillPrompt,
    "---",
    `Run the four-phase workflow above against the CaT project at ${projectDir}.`,
    "Read bacon/ and cat.config.yaml relative to that directory, and write any",
    "generated code, spec edits, and the purr file relative to that directory too.",
  ].join("\n\n");

  let agent: Awaited<ReturnType<typeof Agent.create>> | undefined;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: options.model ?? "composer-2.5" },
      local: { cwd: projectDir },
    });
    const run = await agent.send(prompt);
    let text = "";
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
            text += block.text;
          }
        }
      }
    }
    const result = await run.wait();
    if (result.status === "error") {
      return { kind: "run-error", runId: result.id };
    }
    return { kind: "finished", text };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return { kind: "startup-error", message: err.message, retryable: err.isRetryable };
    }
    throw err;
  } finally {
    await agent?.[Symbol.asyncDispose]?.();
  }
}

async function loadTranspilerSkillPrompt(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  // cli/dist/lib -> repo root is two levels up from cli/, i.e. ../../../
  const repoRoot = join(here, "..", "..", "..");
  const skillPath = join(repoRoot, CURSOR_TRANSPILER_SKILL_PATH);
  return readFile(skillPath, "utf8");
}

export function parseStructuredBlocks(text: string): Record<string, string> {
  const blocks: Record<string, string> = {};
  const re = /```(cat-validate|cat-enrich|cat-result)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const [, tag, body] = match;
    if (tag && body) blocks[tag] = body;
  }
  return blocks;
}
