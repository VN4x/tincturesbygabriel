import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Copy gitignored EPUBs into the Vercel/Nitro server output so /api/book can
 * read them at runtime. Never copies into public/.
 */
export function copyPrivateBooksIntoServerOutput(root = process.cwd()): string[] {
  const src = join(root, "private/books");
  if (!existsSync(src)) return [];
  const files = readdirSync(src).filter((name) => name.toLowerCase().endsWith(".epub"));
  if (files.length === 0) return [];

  const dests = [join(root, ".output/server/private/books")];
  const functionsDir = join(root, ".vercel/output/functions");
  if (existsSync(functionsDir)) {
    for (const name of readdirSync(functionsDir)) {
      if (name.endsWith(".func")) dests.push(join(functionsDir, name, "private/books"));
    }
  } else {
    dests.push(join(root, ".vercel/output/functions/__server.func/private/books"));
  }

  const copied: string[] = [];
  for (const dest of dests) {
    mkdirSync(dest, { recursive: true });
    for (const file of files) {
      const to = join(dest, file);
      cpSync(join(src, file), to);
      copied.push(to);
    }
  }
  return copied;
}
