import { access, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { findMarkdownFiles } from "./discover.js";
import { loadCatConfig, findProviderByName, isRemoteUri, REFERENCE_KINDS } from "./config.js";
import { getHeadCommit } from "./git.js";
import { loadPurr } from "./purr.js";
import {
  isReferenceType,
  parseSpecFile,
  referencedModelName,
  REQ_BODY_MAX_CHARS,
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

export interface ValidateOptions {
  /** Treat warnings as failures (OpenSpec parity). */
  readonly strict?: boolean;
}

export interface ValidateResult {
  readonly status: "pass" | "fail";
  readonly strict: boolean;
  readonly commit: string | null;
  readonly lastTranspiledCommit: string | null;
  readonly filesScanned: readonly string[];
  readonly models: readonly string[];
  readonly features: readonly string[];
  readonly requirements: readonly string[];
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

export async function validate(projectDir: string, options: ValidateOptions = {}): Promise<ValidateResult> {
  const strict = options.strict === true;
  const baconDir = join(projectDir, "bacon");
  const configPath = join(projectDir, "cat.config.yaml");
  const purrPath = join(projectDir, "purr");

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const error = (file: string, line: number, code: string, message: string) =>
    errors.push({ file, line, code, message, severity: "error" });
  const warn = (file: string, line: number, code: string, message: string) =>
    warnings.push({ file, line, code, message, severity: "warning" });

  const filePaths = await findMarkdownFiles(baconDir);
  const files: SpecFile[] = [];
  for (const abs of filePaths) {
    const rel = relative(projectDir, abs).split(sep).join("/");
    const raw = await readFile(abs, "utf8");
    files.push(parseSpecFile(rel, raw));
  }

  // --- Project shape -------------------------------------------------------

  const systemFile = files.find((f) => f.path === "bacon/system.md");
  if (!systemFile) {
    error("bacon/system.md", 1, "E_NO_SYSTEM", "No system.md found. Every CaT project needs one.");
  } else {
    if (!systemFile.frontmatter["name"]) {
      error(systemFile.path, 1, "E_NO_NAME_DECL", "system.md frontmatter must declare `name: <name>`");
    }
    if (!systemFile.frontmatter["stack"]) {
      error(systemFile.path, 1, "E_MISSING_STACK", "system.md frontmatter must declare a `stack:` block");
    }
  }

  const config = await loadCatConfig(configPath);
  if (!config) {
    error("cat.config.yaml", 1, "E_INVALID_CONFIG", "No cat.config.yaml found. Every CaT project needs one.");
  } else if (!config.version || !config.transpiler) {
    error("cat.config.yaml", 1, "E_INVALID_CONFIG", "cat.config.yaml must declare both `version` and `transpiler`");
  }

  // --- References declared in config (SPEC.md §7.1) -----------------------

  const references = config?.references ?? {};
  const exists = async (rel: string) =>
    access(join(projectDir, rel)).then(
      () => true,
      () => false,
    );
  for (const [name, ref] of Object.entries(references)) {
    const kind = typeof ref?.kind === "string" ? ref.kind : "";
    const uri = typeof ref?.uri === "string" ? ref.uri.trim() : "";
    if (!(REFERENCE_KINDS as readonly string[]).includes(kind) || uri === "") {
      error(
        "cat.config.yaml",
        1,
        "E_REFERENCE_KIND",
        `Reference \`${name}\` needs \`uri\` and a \`kind\` of ${REFERENCE_KINDS.join(", ")}`,
      );
      continue;
    }
    const snapshot = typeof ref.snapshot === "string" ? ref.snapshot.trim() : "";
    if (isRemoteUri(uri)) {
      if (snapshot === "") {
        warn(
          "cat.config.yaml",
          1,
          "W_REFERENCE_NO_SNAPSHOT",
          `Reference \`${name}\` has a remote uri and no \`snapshot\` — cat-transpile is offline and cannot read it`,
        );
      }
    } else if (!(await exists(uri))) {
      warn("cat.config.yaml", 1, "W_REFERENCE_MISSING", `Reference \`${name}\` uri \`${uri}\` does not exist`);
    }
    if (snapshot !== "" && !(await exists(snapshot))) {
      warn("cat.config.yaml", 1, "W_REFERENCE_MISSING", `Reference \`${name}\` snapshot \`${snapshot}\` does not exist`);
    }
  }

  for (const file of files) {
    for (const name of file.references) {
      if (!(name in references)) {
        error(
          file.path,
          1,
          "E_UNKNOWN_REFERENCE",
          `\`references: ${name}\` is not declared under \`references:\` in cat.config.yaml`,
        );
      }
    }
    if (file.path.startsWith("bacon/features/") && !file.frontmatter["feature"]) {
      error(
        file.path,
        1,
        "E_NO_FEATURE_DECL",
        `${file.path} is under bacon/features/ but has no \`feature:\` frontmatter field`,
      );
    }
  }

  // --- Pass 1: names ---------------------------------------------------------

  const modelOwner = new Map<string, SpecFile>();
  const featureOwner = new Map<string, SpecFile>();
  const requirementIds: string[] = [];
  for (const file of files) {
    for (const model of file.models) {
      const existing = modelOwner.get(model.name);
      if (existing) {
        const where = existing.path === file.path ? "earlier in this file" : `in \`${existing.path}\``;
        error(file.path, model.line, "E_DUPLICATE_MODEL", `Model \`${model.name}\` is already defined ${where}`);
      } else {
        modelOwner.set(model.name, file);
      }
    }
    const featureName = file.frontmatter["feature"];
    if (typeof featureName === "string" && featureName.trim() !== "") {
      const existing = featureOwner.get(featureName);
      if (existing && existing.path !== file.path) {
        error(file.path, 1, "E_DUPLICATE_FEATURE", `Feature \`${featureName}\` is already defined in \`${existing.path}\``);
      } else if (!existing) {
        featureOwner.set(featureName, file);
      }
    }
  }

  // --- Pass 2: per-file checks --------------------------------------------

  const referencedFrom = new Map<string, Set<string>>();
  for (const file of files) {
    const scopeName = String(file.frontmatter["feature"] ?? file.frontmatter["name"] ?? file.path);

    if (!file.hasPurpose) {
      warn(file.path, 1, "W_NO_PURPOSE", `${file.path} has no \`## Purpose\` section`);
    }

    // Models
    for (const model of file.models) {
      let hasPrimaryKey = false;
      for (const field of model.fields) {
        if (field.type.trim() === "") {
          warn(
            file.path,
            field.line,
            "W_NO_FIELD_TYPE",
            `Field \`${model.name}.${field.name}\` has no type — will be inferred as \`text\``,
          );
        } else if (isReferenceType(field.type)) {
          const refName = referencedModelName(field.type);
          if (!modelOwner.has(refName)) {
            error(
              file.path,
              field.line,
              "E_UNRESOLVED_REF",
              `Model \`${model.name}\` references \`${refName}\`, but no Model \`${refName}\` exists`,
            );
          } else {
            if (!referencedFrom.has(refName)) referencedFrom.set(refName, new Set());
            referencedFrom.get(refName)!.add(file.path);
          }
        }
        if (field.name.toLowerCase() === "id" || /primary key/i.test(field.notes)) hasPrimaryKey = true;
      }
      if (!hasPrimaryKey) {
        warn(
          file.path,
          model.line,
          "W_NO_PRIMARY_KEY",
          `Model \`${model.name}\` has no primary key — \`id: uuid\` (primary key) will be added`,
        );
      }
    }

    // Flows
    for (const flow of file.flows) {
      if (flow.stepCount === 0) {
        error(file.path, flow.line, "E_EMPTY_FLOW", `Flow \`${flow.name}\` has no steps`);
      }
    }

    // Named requirements and scenarios
    const seenReq = new Map<string, number>();
    for (const req of file.requirements) {
      const label = `Requirement \`${req.name}\``;
      const prev = seenReq.get(req.name);
      if (prev !== undefined) {
        error(file.path, req.line, "E_DUPLICATE_REQ", `${label} is already defined at line ${prev} of this file`);
      } else {
        seenReq.set(req.name, req.line);
        requirementIds.push(`${scopeName} / ${req.name}`);
      }

      if (req.body === "") {
        error(
          file.path,
          req.line,
          "E_REQ_NO_BODY",
          `${label} has no body — write one to three sentences with MUST/SHOULD/MAY before the first scenario`,
        );
      } else {
        if (req.keyword === null) {
          warn(
            file.path,
            req.line,
            "W_REQ_NO_KEYWORD",
            `${label} body has no uppercase BCP 14 keyword (MUST, SHOULD, MAY…) — it is not normative`,
          );
        } else if (!req.isEars) {
          warn(
            file.path,
            req.line,
            "W_REQ_NOT_EARS",
            `${label} body matches no EARS template (WHEN/WHILE/IF…THEN/WHERE, or "<subject> ${req.keyword} …")`,
          );
        }
        if (req.body.length > REQ_BODY_MAX_CHARS) {
          warn(
            file.path,
            req.line,
            "W_REQ_LONG",
            `${label} body is ${req.body.length} characters; keep it under ${REQ_BODY_MAX_CHARS} and move detail into scenarios`,
          );
        }
      }

      if (req.scenarios.length === 0) {
        warn(file.path, req.line, "W_REQ_NO_SCENARIO", `${label} has no \`#### Scenario:\` — nothing will be tested`);
      }
      for (const sc of req.scenarios) {
        if (!sc.hasThen) {
          error(
            file.path,
            sc.line,
            "E_SCENARIO_NO_THEN",
            `Scenario \`${sc.name}\` under ${label} has no THEN step — it asserts nothing`,
          );
        }
      }
    }
    for (const sc of file.orphanScenarios) {
      error(
        file.path,
        sc.line,
        "E_SCENARIO_OUTSIDE_REQ",
        `Scenario \`${sc.name}\` is not under a \`### Requirement:\` heading`,
      );
    }

    // Feature-level checks
    if (file.isFeatureFile) {
      const isSparse =
        file.usingProviders.length === 0 &&
        file.flows.length === 0 &&
        file.views.length === 0 &&
        file.models.length === 0 &&
        file.requirements.length === 0 &&
        file.inlineRequirements.length === 0;
      if (isSparse) {
        warn(file.path, 1, "W_SPARSE_FEATURE", `Feature \`${scopeName}\` is very sparse — the transpiler will make all decisions`);
      }
      for (const provider of file.usingProviders) {
        if (!findProviderByName(config, provider)) {
          warn(
            file.path,
            1,
            "W_NO_PROVIDER_PROFILE",
            `No provider profile found for \`${provider}\` — the transpiler will use general knowledge`,
          );
        }
      }
    }
  }

  // --- Pass 3: models in a feature file referenced elsewhere ---------------

  for (const [modelName, owner] of modelOwner) {
    const isSharedFile = owner.path === "bacon/models.md" || !owner.isFeatureFile;
    if (isSharedFile) continue;
    const referencers = referencedFrom.get(modelName);
    if (!referencers) continue;
    const external = [...referencers].filter((p) => p !== owner.path);
    if (external.length > 0) {
      warn(
        owner.path,
        1,
        "W_CROSS_FEATURE_MODEL",
        `Model \`${modelName}\` is in \`${owner.path}\` but referenced from \`${external.join(", ")}\` — consider moving to \`models.md\``,
      );
    }
  }

  const commit = await getHeadCommit(projectDir);
  const purr = await loadPurr(purrPath);
  const decisions = Array.isArray(purr?.["decisions"]) ? (purr!["decisions"] as unknown[]) : [];
  if (decisions.length > 0) {
    warn(
      "purr",
      1,
      "W_DECISIONS_OPEN",
      `purr has ${decisions.length} open decision(s) — resolve them into the spec with cat-author`,
    );
  }
  const failed = errors.length > 0 || (strict && warnings.length > 0);

  return {
    status: failed ? "fail" : "pass",
    strict,
    commit,
    lastTranspiledCommit: purr?.last_transpiled_commit ?? null,
    filesScanned: files.map((f) => f.path),
    models: [...modelOwner.keys()],
    features: [...featureOwner.keys()],
    requirements: requirementIds,
    errors,
    warnings,
  };
}
