/**
 * Server-only sample extract. Most chapters are teasers (`complete: false`).
 * Locked chapters are truncated again in `getSample` before reaching the browser.
 * The full EPUB is never imported here — see `/api/book`.
 */
import bookEt from "./book-et.json";

export type Block =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "part"; text: string }
  | { t: "table"; rows: string[][] };

export type Section = {
  id: string;
  kind: "front" | "chapter";
  label: string;
  title: string;
  page: number;
  words: number;
  blocks: Block[];
  complete?: boolean;
};

export type Book = {
  language: string;
  title: string;
  author: string;
  sections: Section[];
};

export function getBook(): Book {
  return bookEt as unknown as Book;
}
