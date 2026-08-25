import { createServerFn } from "@tanstack/react-start";

export type PublicBlock =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "part"; text: string }
  | { t: "table"; rows: string[][] };

export type PublicSection = {
  id: string;
  kind: "front" | "chapter";
  label: string;
  title: string;
  page: number;
  words: number;
  locked: boolean;
  /** For locked sections this holds only a short teaser, never the full text. */
  blocks: PublicBlock[];
  hiddenBlocks: number;
};

export type Sample = {
  title: string;
  author: string;
  openCount: number;
  totalChapters: number;
  sections: PublicSection[];
};

/**
 * Returns the book with a random handful of sections opened in full.
 * Locked sections are truncated here, on the server.
 */
export const getSample = createServerFn({ method: "POST" }).handler(async (): Promise<Sample> => {
  const { getBook } = await import("../content/book.server");
  const book = getBook();

  // The title page / colophon carries no reading content.
  const readable = book.sections.filter((s) => s.id !== "avaleht");
  const chapters = readable.filter((s) => s.kind === "chapter");
  const completeChapters = chapters.filter((s) => s.complete !== false);
  const openIds = new Set<string>();

  // The introduction is always open, plus three random *complete* sample chapters.
  const intro = readable.find((s) => s.id.startsWith("sissejuhatus"));
  if (intro) openIds.add(intro.id);

  const pool = [...completeChapters];
  for (let i = 0; i < 3 && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    const picked = pool.splice(idx, 1)[0];
    if (picked) openIds.add(picked.id);
  }

  // Reading-priority order: intro first, then the opened chapters, then the locked rest.
  const ordered = [...readable].sort((a, b) => {
    const rank = (s: (typeof readable)[number]) =>
      s.id.startsWith("sissejuhatus") ? 0 : openIds.has(s.id) ? 1 : 2;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return readable.indexOf(a) - readable.indexOf(b);
  });

  const sections: PublicSection[] = ordered.map((s) => {
    const locked = !openIds.has(s.id);
    if (!locked) {
      return { ...s, locked: false, hiddenBlocks: 0 };
    }

    const firstPara = s.blocks.find((b) => b.t === "p" && b.text.length > 80);
    const teaser =
      firstPara && firstPara.t === "p"
        ? firstPara.text.split(/(?<=[.!?…])\s/).slice(0, 2).join(" ").slice(0, 340)
        : "";

    return {
      id: s.id,
      kind: s.kind,
      label: s.label,
      title: s.title,
      page: s.page,
      words: s.words,
      locked: true,
      blocks: teaser ? [{ t: "p", text: teaser }] : [],
      hiddenBlocks: Math.max(0, s.blocks.length - 1),
    };
  });

  return {
    title: book.title,
    author: book.author,
    openCount: openIds.size,
    totalChapters: chapters.length,
    sections,
  };
});
