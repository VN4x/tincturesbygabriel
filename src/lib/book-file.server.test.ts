import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bookPathCandidates, loadEpubBytes } from "./book-file.server";
import { copyPrivateBooksIntoServerOutput } from "./copy-books-output";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  delete process.env["BOOK_PATH"];
  delete process.env["BOOK_URL"];
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "mv-books-"));
  tempRoots.push(root);
  return root;
}

describe("copyPrivateBooksIntoServerOutput", () => {
  it("copies gitignored EPUBs into the Vercel function folder, not public/", () => {
    const root = tempRoot();
    mkdirSync(join(root, "private/books"), { recursive: true });
    mkdirSync(join(root, "public"), { recursive: true });
    mkdirSync(join(root, ".vercel/output/functions/__server.func"), { recursive: true });
    writeFileSync(join(root, "private/books/metsa-vagi.epub"), "PK-epub");

    const copied = copyPrivateBooksIntoServerOutput(root);
    expect(copied.some((p) => p.includes("__server.func/private/books/metsa-vagi.epub"))).toBe(true);
    expect(readFileSync(join(root, ".vercel/output/functions/__server.func/private/books/metsa-vagi.epub"), "utf8")).toBe(
      "PK-epub",
    );
    expect(copied.some((p) => p.includes(`${join(root, "public")}`))).toBe(false);
  });

  it("is a no-op when private/books has no EPUB", () => {
    const root = tempRoot();
    mkdirSync(join(root, "private/books"), { recursive: true });
    expect(copyPrivateBooksIntoServerOutput(root)).toEqual([]);
  });
});

describe("loadEpubBytes", () => {
  it("reads BOOK_PATH from disk", async () => {
    const root = tempRoot();
    const path = join(root, "book.epub");
    writeFileSync(path, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    process.env["BOOK_PATH"] = path;
    const bytes = await loadEpubBytes();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes && [...bytes]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("includes the Vercel function private path among candidates", () => {
    expect(bookPathCandidates().some((p) => p.endsWith("private/books/metsa-vagi.epub"))).toBe(true);
  });
});
