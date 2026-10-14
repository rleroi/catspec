import { claudeCode } from "./claude-code.js";
import { cursorCli } from "./cursor-cli.js";
import { cursorSdk } from "./cursor-sdk.js";
import type { AgentBackend } from "./types.js";

export const AGENTS: readonly AgentBackend[] = [cursorSdk, cursorCli, claudeCode];
export const DEFAULT_AGENT = cursorSdk.name;

export function findAgent(name: string): AgentBackend | undefined {
  return AGENTS.find((a) => a.name === name.trim().toLowerCase());
}

export type { AgentBackend, AgentRunOptions, TranspileOutcome } from "./types.js";
