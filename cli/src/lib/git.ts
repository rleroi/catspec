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

export async function commitExists(cwd: string, commit: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["cat-file", "-e", commit], { cwd });
    return true;
  } catch {
    return false;
  }
}
