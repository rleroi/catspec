import { readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { findMarkdownFiles } from "./discover.js";
import { loadCatConfig, findProviderByName } from "./config.js";
import { getHeadCommit } from "./git.js";
import { loadPurr } from "./purr.js";
import {
  isReferenceType,
  parseSpecFile,
  referencedModelName,
  type SpecFile,
} from "./spec.js";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  readonly file: string;
  readonly line: number;
  readonly code: string;
  readonly message: string;
  readonly severity: Severity;
}

export interface ValidateResult {
  readonly status: "pass" | "fail";
  readonly commit: string | null;
  readonly lastTranspiledCommit: string | null;
  readonly filesScanned: readonly string[];
  readonly models: readonly string[];
  readonly features: readonly string[];
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

export async function validate(projectDir: string): Promise<ValidateResult> {
  const baconDir = join(projectDir, "bacon");
  const configPath = join(projectDir, "cat.config.yaml");
  const purrPath = join(projectDir, "purr");

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const filePaths = await findMarkdownFiles(baconDir);
  const files: SpecFile[] = [];
  for (const abs of filePaths) {
    const rel = relative(projectDir, abs).split(sep).join("/");
    const raw = await readFile(abs, "utf8");
    files.push(parseSpecFile(rel, raw));
  }

  const systemFile = files.find((f) => f.path === "bacon/system.md");
  if (!systemFile) {
    errors.push({
      file: "bacon/system.md",
      line: 1,
      code: "E_NO_SYSTEM",
      message: "No system.md found. Every CaT project needs one.",
      severity: "error",
    });
  } else {
    if (!systemFile.frontmatter["name"]) {
      errors.push({
        file: systemFile.path,
        line: 1,
        code: "E_NO_NAME_DECL",
        message: "system.md frontmatter must declare `name: <name>`",
        severity: "error",
      });
    }
    if (!systemFile.frontmatter["stack"]) {
      errors.push({
        file: systemFile.path,
        line: 1,
        code: "E_MISSING_STACK",
        message: "system.md frontmatter must declare a `stack:` block",
        severity: "error",
      });
    }
  }

  const config = await loadCatConfig(configPath);
  if (!config) {
    errors.push({
      file: "cat.config.yaml",
      line: 1,
      code: "E_INVALID_CONFIG",
      message: "No cat.config.yaml found. Every CaT project needs one.",
      severity: "error",
    });
  } else if (!config.version || !config.transpiler) {
    errors.push({
      file: "cat.config.yaml",
      line: 1,
      code: "E_INVALID_CONFIG",
      message: "cat.config.yaml must declare both `version` and `transpiler`",
      severity: "error",
    });
  }

  for (const file of files) {
    if (file.path.startsWith("bacon/features/") && !file.frontmatter["feature"]) {
      errors.push({
        file: file.path,
        line: 1,
        code: "E_NO_FEATURE_DECL",
        message: `${file.path} is under bacon/features/ but has no \`feature:\` frontmatter field`,
        severity: "error",
      });
    }
  }

  // Pass 1: collect all model and feature names with their defining file.
  const modelOwner = new Map<string, SpecFile>();
  const featureOwner = new Map<string, SpecFile>();
  for (const file of files) {
    for (const model of file.models) {
      const existing = modelOwner.get(model.name);
      if (existing) {
        const where = existing.path === file.path ? "earlier in this file" : `in \`${existing.path}\``;
        errors.push({
          file: file.path,
          line: model.line,
          code: "E_DUPLICATE_MODEL",
          message: `Model \`${model.name}\` is already defined ${where}`,
          severity: "error",
        });
      } else {
        modelOwner.set(model.name, file);
      }
    }
    const featureName = file.frontmatter["feature"];
    if (typeof featureName === "string" && featureName.trim() !== "") {
      const existing = featureOwner.get(featureName);
      if (existing && existing.path !== file.path) {
        errors.push({
          file: file.path,
          line: 1,
          code: "E_DUPLICATE_FEATURE",
          message: `Feature \`${featureName}\` is already defined in \`${existing.path}\``,
          severity: "error",
        });
      } else if (!existing) {
        featureOwner.set(featureName, file);
      }
    }
  }

  // Pass 2: field-level checks (unresolved refs, missing types, primary keys)
  // and cross-file model reference tracking.
  const referencedFrom = new Map<string, Set<string>>();
  for (const file of files) {
    for (const model of file.models) {
      let hasPrimaryKey = false;
      for (const field of model.fields) {
        if (field.type.trim() === "") {
          warnings.push({
            file: file.path,
            line: field.line,
            code: "W_NO_FIELD_TYPE",
            message: `Field \`${model.name}.${field.name}\` has no type — will be inferred as \`text\``,
            severity: "warning",
          });
        } else if (isReferenceType(field.type)) {
          const refName = referencedModelName(field.type);
          if (!modelOwner.has(refName)) {
            errors.push({
              file: file.path,
              line: field.line,
              code: "E_UNRESOLVED_REF",
              message: `Model \`${model.name}\` references \`${refName}\`, but no Model \`${refName}\` exists`,
              severity: "error",
            });
          } else {
            if (!referencedFrom.has(refName)) referencedFrom.set(refName, new Set());
            referencedFrom.get(refName)!.add(file.path);
          }
        }
        if (
          field.name.toLowerCase() === "id" ||
          /primary key/i.test(field.notes)
        ) {
          hasPrimaryKey = true;
        }
      }
      if (!hasPrimaryKey) {
        warnings.push({
          file: file.path,
          line: model.line,
          code: "W_NO_PRIMARY_KEY",
          message: `Model \`${model.name}\` has no primary key — \`id: uuid\` (primary key) will be added`,
          severity: "warning",
        });
      }
    }

    for (const flow of file.flows) {
      if (flow.stepCount === 0) {
        errors.push({
          file: file.path,
          line: flow.line,
          code: "E_EMPTY_FLOW",
          message: `Flow \`${flow.name}\` has no steps`,
          severity: "error",
        });
      }
    }

    if (file.isFeatureFile) {
      const featureName = String(file.frontmatter["feature"] ?? file.path);
      const isSparse =
        file.usingProviders.length === 0 &&
        file.flows.length === 0 &&
        file.views.length === 0 &&
        file.models.length === 0;
      if (isSparse) {
        warnings.push({
          file: file.path,
          line: 1,
          code: "W_SPARSE_FEATURE",
          message: `Feature \`${featureName}\` is very sparse — the LLM will make all decisions`,
          severity: "warning",
        });
      }

      for (const provider of file.usingProviders) {
        if (!findProviderByName(config, provider)) {
          warnings.push({
            file: file.path,
            line: 1,
            code: "W_NO_PROVIDER_PROFILE",
            message: `No provider entry found for \`${provider}\` — LLM will use general knowledge`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Pass 3: models defined in a feature file but referenced from elsewhere.
  for (const [modelName, owner] of modelOwner) {
    const isSharedFile = owner.path === "bacon/models.md" || !owner.isFeatureFile;
    if (isSharedFile) continue;
    const referencers = referencedFrom.get(modelName);
    if (!referencers) continue;
    const externalReferencers = [...referencers].filter((p) => p !== owner.path);
    if (externalReferencers.length > 0) {
      warnings.push({
        file: owner.path,
        line: 1,
        code: "W_CROSS_FEATURE_MODEL",
        message: `Model \`${modelName}\` is in \`${owner.path}\` but referenced from \`${externalReferencers.join(
          ", ",
        )}\` — consider moving to \`models.md\``,
        severity: "warning",
      });
    }
  }

  const commit = await getHeadCommit(projectDir);
  const purr = await loadPurr(purrPath);

  return {
    status: errors.length > 0 ? "fail" : "pass",
    commit,
    lastTranspiledCommit: purr?.last_transpiled_commit ?? null,
    filesScanned: files.map((f) => f.path),
    models: [...modelOwner.keys()],
    features: [...featureOwner.keys()],
    errors,
    warnings,
  };
}
