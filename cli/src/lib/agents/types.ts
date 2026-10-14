export type TranspileOutcome =
  | { readonly kind: "finished"; readonly text: string }
  | { readonly kind: "run-error"; readonly runId: string }
  | { readonly kind: "startup-error"; readonly message: string; readonly retryable: boolean };

export interface AgentRunOptions {
  /** Project directory the agent works in. */
  readonly cwd: string;
  /** Full prompt: skill text plus task. */
  readonly prompt: string;
  /** LLM id, backend-specific. */
  readonly model?: string;
  /** API key where the backend needs one. */
  readonly apiKey?: string;
  /** Override the executable (tests, custom installs). */
  readonly bin?: string;
  /** Stream assistant text here. Default: process.stdout. */
  readonly onText?: (chunk: string) => void;
}

/** One agent backend: how `catspec transpile` hands the cat-transpile skill to an LLM runtime. */
export interface AgentBackend {
  readonly name: string;
  readonly description: string;
  run(options: AgentRunOptions): Promise<TranspileOutcome>;
}
