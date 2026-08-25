/**
 * Server-only access to the full book text.
 *
 * The complete text lives here and is never imported by client code. Locked
 * chapters are truncated on the server before anything is sent to the browser,
 * so client-side blur is presentation only — not the protection.
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
