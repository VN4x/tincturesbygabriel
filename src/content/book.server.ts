/**
 * Server-only access to the full book text.
 *
 * The text is NOT in this repository. It lives in the private `book_sections`
 * table, which has no anon/authenticated grants — only service-role server code
 * can read it. Locked chapters are truncated here, on the server, before
 * anything reaches the browser, so the client-side blur is presentation only.
 */

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

const TITLE = "Metsa vägi ja tervis";
const AUTHOR = "Gabriel Corpus";

/** Per-worker cache: the text is immutable, so one read per instance is enough. */
let cached: Book | null = null;

export async function getBook(): Promise<Book> {
  if (cached) return cached;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("book_sections")
    .select("id, language, kind, label, title, page, words, blocks")
    .order("ord", { ascending: true });

  if (error) throw new Error(`Raamatu teksti ei saanud laadida: ${error.message}`);

  const rows = data ?? [];
  const book: Book = {
    language: rows[0]?.language ?? "et-EE",
    title: TITLE,
    author: AUTHOR,
    sections: rows.map((r) => ({
      id: r.id,
      kind: r.kind === "chapter" ? "chapter" : "front",
      label: r.label,
      title: r.title,
      page: r.page,
      words: r.words,
      blocks: r.blocks as unknown as Block[],
    })),
  };

  cached = book;
  return book;
}
