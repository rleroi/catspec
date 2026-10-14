import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getHeadCommit(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getChangedFilesSince(
  cwd: string,
  sinceCommit: string,
  pathspec: string,
): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--name-only", `${sinceCommit}..HEAD`, "--", pathspec],
      { cwd },
    );
    return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export interface CommitInfo {
  readonly sha: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly subject: string;
  readonly files: readonly string[];
}

/** Commits in `range` (e.g. `abc..HEAD`), oldest first, with touched paths. */
export async function listCommits(cwd: string, range: string): Promise<CommitInfo[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--reverse", "--format=%x1e%H%x1f%an%x1f%ae%x1f%s", "--name-only", range],
    { cwd, maxBuffer: 64 * 1024 * 1024 },
  );
  const commits: CommitInfo[] = [];
  for (const chunk of stdout.split("\x1e")) {
    if (chunk.trim() === "") continue;
    const [header = "", ...rest] = chunk.split("\n");
    const [sha = "", authorName = "", authorEmail = "", subject = ""] = header.split("\x1f");
    const files = rest.map((l) => l.trim()).filter(Boolean);
    commits.push({ sha, authorName, authorEmail, subject, files });
  }
  return commits;
}

export async function rootCommit(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd });
    return stdout.trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

export async function commitExists(cwd: string, commit: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["cat-file", "-e", commit], { cwd });
    return true;
  } catch {
    return false;
  }
}
