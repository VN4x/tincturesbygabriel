import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function toBytes(raw: unknown): Uint8Array | null {
  if (!raw) return null;
  if (raw instanceof Uint8Array) return raw.byteLength ? raw : null;
  if (raw instanceof ArrayBuffer) return raw.byteLength ? new Uint8Array(raw) : null;
  if (ArrayBuffer.isView(raw) && raw.buffer instanceof ArrayBuffer) {
    const view = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    return view.byteLength ? view : null;
  }
  return null;
}

export function bookPathCandidates(): string[] {
  return [
    process.env["BOOK_PATH"],
    resolve(process.cwd(), "private/books/metsa-vagi.epub"),
    resolve(process.cwd(), "120326reflowable.epub"),
  ].filter((p): p is string => Boolean(p));
}

async function loadFromUrl(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return toBytes(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadFromNitroAssets(): Promise<Uint8Array | null> {
  try {
    const { useStorage } = await import("nitro/storage");
    const store = useStorage("assets:books");
    const keys = ["metsa-vagi.epub", "metsa-vagi.en.epub"];
    try {
      const listed = await store.getKeys();
      for (const key of listed) {
        if (key.toLowerCase().endsWith(".epub") && !keys.includes(key)) keys.push(key);
      }
    } catch {
      /* getKeys optional */
    }
    for (const key of keys) {
      const raw = await store.getItem(key).catch(() => null);
      const bytes = toBytes(raw);
      if (bytes) return bytes;
    }
  } catch {
    return null;
  }
  return null;
}

async function loadFromDisk(): Promise<Uint8Array | null> {
  for (const path of bookPathCandidates()) {
    try {
      if (!existsSync(path)) continue;
      const bytes = toBytes(await readFile(path));
      if (bytes) return bytes;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function loadEpubBytes(): Promise<Uint8Array | null> {
  const bookUrl = process.env["BOOK_URL"];
  if (bookUrl) {
    const fromUrl = await loadFromUrl(bookUrl);
    if (fromUrl) return fromUrl;
  }

  const fromAssets = await loadFromNitroAssets();
  if (fromAssets) return fromAssets;

  return loadFromDisk();
}
