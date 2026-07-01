import yaml from "js-yaml";
import type { ValidateResult } from "./validate.js";

export function formatValidateBlock(result: ValidateResult): string {
  const body = {
    status: result.status,
    commit: result.commit,
    last_transpiled_commit: result.lastTranspiledCommit,
    files_scanned: result.filesScanned,
    models: result.models,
    features: result.features,
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
