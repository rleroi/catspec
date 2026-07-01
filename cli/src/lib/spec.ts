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

export interface SpecFile {
  readonly path: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly models: readonly Model[];
  readonly flows: readonly Flow[];
  readonly views: readonly View[];
  readonly isFeatureFile: boolean;
  readonly usingProviders: readonly string[];
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
const ANY_HEADING = /^#{1,6}\s+/;
const TABLE_ROW = /^\|(.+)\|\s*$/;
const TABLE_SEPARATOR = /^\|[\s:|-]+\|\s*$/;
const NUMBERED_STEP = /^\d+\.\s+/;

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

export function parseSpecFile(relPath: string, raw: string): SpecFile {
  const parsed = matter(raw);
  const frontmatter = parsed.data as Record<string, unknown>;
  const bodyOffset = countLines(raw) - countLines(parsed.content);
  const lines = parsed.content.split("\n");

  const models: Model[] = [];
  const flows: Flow[] = [];
  const views: View[] = [];

  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) {
      i++;
      continue;
    }

    const modelMatch = MODEL_HEADING.exec(line);
    const flowMatch = FLOW_HEADING.exec(line);
    const viewMatch = VIEW_HEADING.exec(line);

    if (modelMatch) {
      const startLine = bodyOffset + i + 1;
      i++;
      // Skip blank lines before the table.
      while (i < lines.length && (lines[i] ?? "").trim() === "") i++;
      const fields: ModelField[] = [];
      if (TABLE_ROW.test((lines[i] ?? "").trim())) {
        i++; // header row
        if (TABLE_SEPARATOR.test((lines[i] ?? "").trim())) i++; // separator row
        while (i < lines.length && TABLE_ROW.test((lines[i] ?? "").trim())) {
          const cells = splitTableRow((lines[i] ?? "").trim());
          const [name = "", type = "", notes = ""] = cells;
          if (name !== "") {
            fields.push({ name, type, notes, line: bodyOffset + i + 1 });
          }
          i++;
        }
      }
      // Look for a trailing "Invariants:" label before the next heading.
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

    if (flowMatch) {
      const startLine = bodyOffset + i + 1;
      i++;
      let stepCount = 0;
      while (i < lines.length && !ANY_HEADING.test(lines[i] ?? "")) {
        if (NUMBERED_STEP.test((lines[i] ?? "").trim())) stepCount++;
        i++;
      }
      flows.push({ name: flowMatch[1] ?? "", stepCount, line: startLine });
      continue;
    }

    if (viewMatch) {
      views.push({ name: viewMatch[1] ?? "", line: bodyOffset + i + 1 });
      i++;
      continue;
    }

    i++;
  }

  const usingRaw = frontmatter["using"];
  const usingProviders = normalizeToStringArray(usingRaw);

  return {
    path: relPath,
    frontmatter,
    models,
    flows,
    views,
    isFeatureFile: typeof frontmatter["feature"] !== "undefined",
    usingProviders,
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
