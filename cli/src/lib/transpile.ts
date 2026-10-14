import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, DEFAULT_AGENT, findAgent, type TranspileOutcome } from "./agents/index.js";
import { loadCatConfig } from "./config.js";

const TRANSPILE_SKILL_PATH = "skills/cat-transpile/SKILL.md";

export interface TranspileOptions {
  /** Backend name. Overrides `transpiler.agent` in cat.config.yaml. */
  readonly agent?: string;
  /** LLM id. Overrides `transpiler.model`. */
  readonly model?: string;
  readonly apiKey?: string;
  /** Executable override for CLI backends. */
  readonly bin?: string;
  readonly onText?: (chunk: string) => void;
}

export type { TranspileOutcome };

/**
 * Runs the cat-transpile skill (headless: validate, generate) against
 * `projectDir` through the configured agent backend.
 */
export async function transpile(
  projectDir: string,
  options: TranspileOptions = {},
): Promise<TranspileOutcome> {
  const config = await loadCatConfig(join(projectDir, "cat.config.yaml"));
  const transpiler = (config?.transpiler ?? {}) as Record<string, unknown>;
  const agentName = options.agent ?? (typeof transpiler["agent"] === "string" ? transpiler["agent"] : DEFAULT_AGENT);
  const agent = findAgent(agentName);
  if (!agent) {
    return {
      kind: "startup-error",
      message: `Unknown agent \`${agentName}\`. Known: ${AGENTS.map((a) => a.name).join(", ")}. Set transpiler.agent in cat.config.yaml or pass --agent.`,
      retryable: false,
    };
  }
  const model = options.model ?? (typeof transpiler["model"] === "string" ? transpiler["model"] : undefined);
  const prompt = buildTranspilePrompt(await loadTranspileSkillPrompt(), projectDir);
  return agent.run({ cwd: projectDir, prompt, model, apiKey: options.apiKey, bin: options.bin, onText: options.onText });
}

export function buildTranspilePrompt(skillText: string, projectDir: string): string {
  return [
    skillText,
    "---",
    `Run the headless transpile above against the CaT project at ${projectDir}.`,
    "Read bacon/ and cat.config.yaml relative to that directory. Write only the",
    "output directory and the purr file, relative to that directory. Do not edit",
    "bacon/ or cat.config.yaml, and do not ask questions.",
  ].join("\n\n");
}

async function loadTranspileSkillPrompt(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  // cli/dist/lib -> repo root is two levels up from cli/, i.e. ../../../
  const repoRoot = join(here, "..", "..", "..");
  return readFile(join(repoRoot, TRANSPILE_SKILL_PATH), "utf8");
}

export function parseStructuredBlocks(text: string): Record<string, string> {
  const blocks: Record<string, string> = {};
  const re = /```(cat-validate|cat-enrich|cat-generate)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const [, tag, body] = match;
    if (tag && body) blocks[tag] = body;
  }
  return blocks;
}
