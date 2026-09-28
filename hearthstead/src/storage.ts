import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

/** Local /data folder today; an S3-compatible implementation can replace it later. */
export interface Storage {
  write(relPath: string, content: string): Promise<void>;
  read(relPath: string): Promise<string>;
}

function resolveInside(root: string, relPath: string) {
  const full = path.resolve(root, relPath);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Path escapes storage root: ${relPath}`);
  return full;
}

export class LocalStorage implements Storage {
  constructor(private root = config.dataDir) {}
  async write(relPath: string, content: string) {
    const full = resolveInside(this.root, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    // Write-then-rename so a crash never leaves half a file behind.
    // Unique per write: two runs of one task may write the same file at once.
    const tmp = `${full}.tmp-${randomUUID()}`;
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, full);
  }
  async read(relPath: string) {
    return fs.readFile(resolveInside(this.root, relPath), "utf8");
  }
}

export const storage: Storage = new LocalStorage();
