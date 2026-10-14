import matter from "gray-matter";

export interface ModelField {
  readonly name: string;
  readonly type: string;
  readonly notes: string;
  readonly line: number;
}

export interface Model {
  readonly name: string;
  readonly fields: readonly ModelField[];
  readonly hasInvariants: boolean;
  readonly line: number;
}

export interface Flow {
  readonly name: string;
  readonly stepCount: number;
  readonly line: number;
}

export interface View {
  readonly name: string;
  readonly line: number;
}

/** A `#### Scenario: <name>` block (SPEC.md §5.1). */
export interface Scenario {
  readonly name: string;
  readonly hasWhen: boolean;
  readonly hasThen: boolean;
  readonly line: number;
}

/** A `### Requirement: <name>` block under `## Requirements` (SPEC.md §5.1). */
export interface Requirement {
  readonly name: string;
  /** Body text between the header and the first scenario, whitespace-joined. */
  readonly body: string;
  readonly keyword: string | null;
  readonly isEars: boolean;
  readonly scenarios: readonly Scenario[];
  readonly line: number;
}

/** A sentence with an uppercase BCP 14 keyword outside `## Requirements` (SPEC.md §5.4). */
export interface InlineRequirement {
  readonly keyword: string;
  readonly text: string;
  readonly isEars: boolean;
  readonly line: number;
}

export interface SpecFile {
  readonly path: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly hasPurpose: boolean;
  readonly models: readonly Model[];
  readonly flows: readonly Flow[];
  readonly views: readonly View[];
  readonly requirements: readonly Requirement[];
  readonly inlineRequirements: readonly InlineRequirement[];
  /** `#### Scenario:` headings that are not under a `### Requirement:`. */
  readonly orphanScenarios: readonly Scenario[];
  readonly isFeatureFile: boolean;
  readonly usingProviders: readonly string[];
  /** Names from the `references:` frontmatter field (reference bindings). */
  readonly references: readonly string[];
}

const PRIMITIVE_TYPES = new Set([
  "text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "timestamp",
  "uuid",
  "email",
  "url",
  "json",
  "currency",
]);

const MODEL_HEADING = /^#{2,6}\s*model:\s*(.+?)\s*$/i;
const FLOW_HEADING = /^#{2,6}\s*flow:\s*(.+?)\s*$/i;
const VIEW_HEADING = /^#{2,6}\s*view:\s*(.+?)\s*$/i;
const PURPOSE_HEADING = /^#{2,6}\s*purpose\s*$/i;
/** OpenSpec grammar: `### Requirement: <name>` and `#### Scenario: <name>`. */
const REQUIREMENT_HEADING = /^###\s*requirement:\s*(.+?)\s*$/i;
const SCENARIO_HEADING = /^####\s*scenario:\s*(.+?)\s*$/i;
const ANY_HEADING = /^#{1,6}\s+/;
const HEADING_LEVEL = /^(#{1,6})\s+/;
const TABLE_ROW = /^\|(.+)\|\s*$/;
const TABLE_SEPARATOR = /^\|[\s:|-]+\|\s*$/;
const NUMBERED_STEP = /^\d+\.\s+/;
const LIST_MARKER = /^(?:[-*+]|\d+\.)\s+/;
/** Scenario step keyword at the start of a bullet, bold or plain. */
const STEP_KEYWORD = /^(?:[-*+]\s+)?(?:\*\*)?(GIVEN|WHEN|THEN|AND|BUT)(?:\*\*)?\b/i;

export const BCP14_KEYWORD =
  /\b(MUST NOT|MUST|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|REQUIRED|OPTIONAL|MAY)\b/;
/** The BCP 14 boilerplate sentence names every keyword; it is not a requirement. */
const BCP14_BOILERPLATE = /\bkey ?words\b/i;

export const REQ_BODY_MAX_CHARS = 500;

function splitTableRow(row: string): string[] {
  return row
    .slice(1, row.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
}

export function isReferenceType(type: string): boolean {
  const base = type.trim().replace(/\[\]$/, "");
  if (base === "") return false;
  if (PRIMITIVE_TYPES.has(base.toLowerCase())) return false;
  if (base.includes(",")) return false;
  return /^[A-Z]/.test(base);
}

export function referencedModelName(type: string): string {
  return type.trim().replace(/\[\]$/, "");
}

/**
 * OpenSpec `normalizeRequirementName`: an ATX heading may end in a closing
 * run of `#`; only a run preceded by a space or tab closes the heading.
 */
export function normalizeRequirementName(name: string): string {
  return name.replace(/[ \t]+#+[ \t]*$/, "").trim();
}

/**
 * Does the text follow an EARS template (SPEC.md §5.3)?
 * WHEN/WHILE/WHERE <clause>, <subject> KEYWORD ...; IF <cond>, THEN ...;
 * or ubiquitous: keyword in the first clause, before any comma.
 */
export function isEarsShaped(text: string): boolean {
  const t = text.trim();
  if (/^IF\b/.test(t)) return /\bTHEN\b/.test(t) && BCP14_KEYWORD.test(t);
  if (/^(WHEN|WHILE|WHERE)\b/.test(t)) {
    const comma = t.indexOf(",");
    return comma > 0 && BCP14_KEYWORD.test(t.slice(comma));
  }
  if (!/^[A-Z@`]/.test(t)) return false;
  const firstClause = t.split(/[,;:]/)[0] ?? t;
  return BCP14_KEYWORD.test(firstClause);
}

function extractInlineRequirements(paragraph: string, startLine: number): InlineRequirement[] {
  // A new candidate sentence starts at any list item; otherwise lines join.
  const lines = paragraph.split("\n");
  const chunks: { text: string; line: number }[] = [];
  for (let k = 0; k < lines.length; k++) {
    const raw = (lines[k] ?? "").trim();
    const stripped = raw.replace(LIST_MARKER, "");
    if (k === 0 || LIST_MARKER.test(raw)) chunks.push({ text: stripped, line: startLine + k });
    else chunks[chunks.length - 1]!.text += " " + stripped;
  }
  const out: InlineRequirement[] = [];
  for (const chunk of chunks) {
    if (BCP14_BOILERPLATE.test(chunk.text)) continue;
    const kw = BCP14_KEYWORD.exec(chunk.text);
    if (!kw) continue;
    out.push({
      keyword: kw[1]!,
      text: chunk.text.trim(),
      isEars: isEarsShaped(chunk.text),
      line: chunk.line,
    });
  }
  return out;
}

interface MutableScenario {
  name: string;
  hasWhen: boolean;
  hasThen: boolean;
  line: number;
}

interface MutableRequirement {
  name: string;
  bodyLines: string[];
  scenarios: MutableScenario[];
  line: number;
}

function finishRequirement(r: MutableRequirement): Requirement {
  const body = r.bodyLines.join(" ").replace(/\s+/g, " ").trim();
  const kw = BCP14_KEYWORD.exec(body);
  return {
    name: r.name,
    body,
    keyword: kw ? kw[1]! : null,
    isEars: body !== "" && isEarsShaped(body),
    scenarios: r.scenarios,
    line: r.line,
  };
}

export function parseSpecFile(relPath: string, raw: string): SpecFile {
  const parsed = matter(raw);
  const frontmatter = parsed.data as Record<string, unknown>;
  const bodyOffset = countLines(raw) - countLines(parsed.content);
  const lines = parsed.content.split("\n");

  const models: Model[] = [];
  const flows: { name: string; stepCount: number; line: number }[] = [];
  const views: View[] = [];
  const requirements: Requirement[] = [];
  const inlineRequirements: InlineRequirement[] = [];
  const orphanScenarios: Scenario[] = [];
  let hasPurpose = false;

  // Prose accumulator for inline requirements (anything outside requirement blocks).
  let para: string[] = [];
  let paraStart = 0;
  const flushPara = () => {
    if (para.length > 0) inlineRequirements.push(...extractInlineRequirements(para.join("\n"), paraStart));
    para = [];
  };

  let currentFlow: { name: string; stepCount: number; line: number } | null = null;
  let currentReq: MutableRequirement | null = null;
  let currentScenario: MutableScenario | null = null;
  const closeRequirement = () => {
    if (currentReq) requirements.push(finishRequirement(currentReq));
    currentReq = null;
    currentScenario = null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    const lineNo = bodyOffset + i + 1;

    // Fenced blocks: skipped entirely. Outside a Model table they are verbatim.
    if (/^```/.test(trimmed)) {
      flushPara();
      let end = i + 1;
      while (end < lines.length && !/^```/.test((lines[end] ?? "").trim())) end++;
      i = end + 1;
      continue;
    }

    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }

    const headingMatch = HEADING_LEVEL.exec(line);
    if (headingMatch) {
      flushPara();
      const level = headingMatch[1]!.length;
      currentFlow = null;

      const reqMatch = REQUIREMENT_HEADING.exec(line);
      const scMatch = SCENARIO_HEADING.exec(line);

      if (reqMatch) {
        closeRequirement();
        currentReq = {
          name: normalizeRequirementName(reqMatch[1] ?? ""),
          bodyLines: [],
          scenarios: [],
          line: lineNo,
        };
        i++;
        continue;
      }
      if (scMatch) {
        const sc: MutableScenario = {
          name: normalizeRequirementName(scMatch[1] ?? ""),
          hasWhen: false,
          hasThen: false,
          line: lineNo,
        };
        if (currentReq) {
          currentReq.scenarios.push(sc);
          currentScenario = sc;
        } else {
          orphanScenarios.push(sc);
          currentScenario = sc; // still track steps so THEN detection works
        }
        i++;
        continue;
      }
      // Any heading at level <= 3 ends the current requirement block.
      if (level <= 3) closeRequirement();

      if (PURPOSE_HEADING.test(line)) hasPurpose = true;

      const modelMatch = MODEL_HEADING.exec(line);
      if (modelMatch) {
        const startLine = lineNo;
        i++;
        while (i < lines.length && (lines[i] ?? "").trim() === "") i++;
        const fields: ModelField[] = [];
        if (TABLE_ROW.test((lines[i] ?? "").trim())) {
          i++; // header row
          if (TABLE_SEPARATOR.test((lines[i] ?? "").trim())) i++;
          while (i < lines.length && TABLE_ROW.test((lines[i] ?? "").trim())) {
            const cells = splitTableRow((lines[i] ?? "").trim());
            const [name = "", type = "", notes = ""] = cells;
            if (name !== "") fields.push({ name, type, notes, line: bodyOffset + i + 1 });
            i++;
          }
        }
        let hasInvariants = false;
        let j = i;
        while (j < lines.length && !ANY_HEADING.test(lines[j] ?? "")) {
          if (/^invariants:\s*$/i.test((lines[j] ?? "").trim())) {
            hasInvariants = true;
            break;
          }
          j++;
        }
        models.push({ name: modelMatch[1] ?? "", fields, hasInvariants, line: startLine });
        continue;
      }

      const flowMatch = FLOW_HEADING.exec(line);
      if (flowMatch) {
        currentFlow = { name: flowMatch[1] ?? "", stepCount: 0, line: lineNo };
        flows.push(currentFlow);
        i++;
        continue;
      }

      const viewMatch = VIEW_HEADING.exec(line);
      if (viewMatch) views.push({ name: viewMatch[1] ?? "", line: lineNo });

      i++;
      continue;
    }

    // Inside a requirement block: body text or scenario steps, never inline prose.
    if (currentReq || currentScenario) {
      if (currentScenario) {
        const step = STEP_KEYWORD.exec(trimmed);
        if (step) {
          const kw = step[1]!.toUpperCase();
          if (kw === "WHEN") currentScenario.hasWhen = true;
          if (kw === "THEN") currentScenario.hasThen = true;
        }
      } else if (currentReq && !TABLE_ROW.test(trimmed)) {
        currentReq.bodyLines.push(trimmed);
      }
      i++;
      continue;
    }

    if (TABLE_ROW.test(trimmed)) {
      i++;
      continue;
    }

    if (currentFlow && NUMBERED_STEP.test(trimmed)) currentFlow.stepCount++;

    if (para.length === 0) paraStart = lineNo;
    para.push(line);
    i++;
  }
  flushPara();
  closeRequirement();

  const usingProviders = normalizeToStringArray(frontmatter["using"]);

  return {
    path: relPath,
    frontmatter,
    hasPurpose,
    models,
    flows,
    views,
    requirements,
    inlineRequirements,
    orphanScenarios,
    isFeatureFile: typeof frontmatter["feature"] !== "undefined",
    usingProviders,
    references: normalizeToStringArray(frontmatter["references"]),
  };
}

function countLines(text: string): number {
  return text.split("\n").length;
}

export function normalizeToStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
