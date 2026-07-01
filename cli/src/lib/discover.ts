import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export async function findMarkdownFiles(baconDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
  }

  await walk(baconDir);
  return results.sort((a, b) => relative(baconDir, a).localeCompare(relative(baconDir, b)));
}
