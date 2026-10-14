#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { validate } from "./lib/validate.js";
import { printValidateSummary } from "./lib/format.js";
import { diff } from "./lib/diff.js";
import { transpile } from "./lib/transpile.js";

const program = new Command();

program
  .name("catspec")
  .description("CLI for CaT (Code as Text) projects: validate, diff and transpile bacon/ specs.")
  .version("0.2.0");

program
  .command("validate")
  .description("Validate bacon/ spec files and cat.config.yaml, emit a cat-validate block.")
  .argument("[dir]", "project directory", ".")
  .option("--strict", "treat warnings as failures", false)
  .action(async (dir: string, opts: { strict: boolean }) => {
    const result = await validate(resolve(dir), { strict: opts.strict });
    printValidateSummary(result);
    if (result.status === "fail") process.exitCode = 1;
  });

program
  .command("diff")
  .description("Show which bacon/ spec files changed since the last transpile recorded in purr.")
  .argument("[dir]", "project directory", ".")
  .action(async (dir: string) => {
    const result = await diff(resolve(dir));
    if (result.fullTranspileNeeded) {
      console.log(`Full transpile needed: ${result.reason ?? "no prior transpile recorded"}`);
      console.log(`  ${result.changedSpecFiles.length} spec file(s): ${result.changedSpecFiles.join(", ") || "(none)"}`);
      return;
    }
    if (result.changedSpecFiles.length === 0) {
      console.log(`Up to date with ${result.lastTranspiledCommit}. Nothing to transpile.`);
      return;
    }
    console.log(`Changed since ${result.lastTranspiledCommit}:`);
    for (const f of result.changedSpecFiles) console.log(`  ~ ${f}`);
    console.log("Affected spec files (including dependents):");
    for (const f of result.affectedSpecFiles) console.log(`  * ${f}`);
    if (result.affectedOutputs.length > 0) {
      console.log("Outputs that will be regenerated:");
      for (const f of result.affectedOutputs) console.log(`  -> ${f}`);
    }
  });

program
  .command("transpile")
  .description("Run validate then generate through an agent (headless, uses the cat-transpile skill).")
  .argument("[dir]", "project directory", ".")
  .option("--model <model>", "LLM id to use", "composer-2.5")
  .option("--api-key <key>", "Cursor API key (defaults to CURSOR_API_KEY)")
  .option("--skip-validate", "skip the local pre-flight validate step", false)
  .action(async (dir: string, opts: { model: string; apiKey?: string; skipValidate: boolean }) => {
    const projectDir = resolve(dir);

    if (!opts.skipValidate) {
      const result = await validate(projectDir);
      printValidateSummary(result);
      if (result.status === "fail") {
        console.error("\nFix the errors above before transpiling.");
        process.exitCode = 1;
        return;
      }
      console.log();
    }

    const outcome = await transpile(projectDir, { model: opts.model, apiKey: opts.apiKey });
    if (outcome.kind === "startup-error") {
      console.error(`\nCouldn't start the agent: ${outcome.message}`);
      process.exitCode = 1;
      return;
    }
    if (outcome.kind === "run-error") {
      console.error(`\nRun ${outcome.runId} failed mid-flight. Inspect it in the Cursor dashboard.`);
      process.exitCode = 2;
      return;
    }
  });

program.parseAsync(process.argv);
