import yaml from "js-yaml";
import type { ValidateResult } from "./validate.js";
import type { VerifyResult } from "./verify.js";

export function formatValidateBlock(result: ValidateResult): string {
  const body = {
    status: result.status,
    strict: result.strict,
    commit: result.commit,
    last_transpiled_commit: result.lastTranspiledCommit,
    files_scanned: result.filesScanned,
    models: result.models,
    features: result.features,
    requirements: result.requirements,
    errors: result.errors.map((e) => ({
      file: e.file,
      line: e.line,
      code: e.code,
      message: e.message,
    })),
    warnings: result.warnings.map((w) => ({
      file: w.file,
      line: w.line,
      code: w.code,
      message: w.message,
    })),
  };
  return "```cat-validate\n" + yaml.dump(body, { lineWidth: 100 }) + "```";
}

export function formatVerifyBlock(result: VerifyResult): string {
  const body = {
    status: result.status,
    base: result.base,
    bot: result.bot,
    output: result.output,
    commits_checked: result.commitsChecked,
    violations: result.violations.map((v) => ({
      commit: v.commit,
      author: v.author,
      subject: v.subject,
      kind: v.kind,
      files: [...v.files],
    })),
  };
  return "```cat-verify\n" + yaml.dump(body, { lineWidth: 100 }) + "```";
}

export function printVerifySummary(result: VerifyResult): void {
  console.log(formatVerifyBlock(result));
  console.log();
  if (result.violations.length === 0) {
    console.log(`Checked ${result.commitsChecked} commit(s) after ${result.base ?? "(root)"}. Ownership intact.`);
    return;
  }
  console.log(`Checked ${result.commitsChecked} commit(s): ${result.violations.length} ownership violation(s).`);
  for (const v of result.violations) {
    const what =
      v.kind === "human_touched_output"
        ? `human commit touched transpiler-owned paths`
        : `bot commit touched human-owned paths`;
    console.log(`  ${v.commit}  ${v.author}  ${what}: ${v.files.join(", ")}`);
  }
}

export function printValidateSummary(result: ValidateResult): void {
  const { errors, warnings } = result;
  console.log(formatValidateBlock(result));
  console.log();
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`Scanned ${result.filesScanned.length} file(s). No issues found.`);
    return;
  }
  console.log(
    `Scanned ${result.filesScanned.length} file(s): ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  for (const e of errors) {
    console.log(`  error   ${e.file}:${e.line}  ${e.code}  ${e.message}`);
  }
  for (const w of warnings) {
    console.log(`  warn    ${w.file}:${w.line}  ${w.code}  ${w.message}`);
  }
}
