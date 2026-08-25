import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function loadEpubBytes(): Promise<Uint8Array | null> {
  const bookUrl = process.env["BOOK_URL"];
  if (bookUrl) {
    try {
      const res = await fetch(bookUrl);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  const candidates = [
    process.env["BOOK_PATH"],
    resolve(process.cwd(), "private/books/metsa-vagi.epub"),
    resolve(process.cwd(), "120326reflowable.epub"),
  ].filter((p): p is string => Boolean(p));

  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      return new Uint8Array(await readFile(path));
    } catch {
      /* try next */
    }
  }
  return null;
}
