import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  /** A half-open chapter: real text up to the cut, then locked. */
  partial?: boolean;
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
  const book = await getBook();

  // The title page / colophon carries no reading content.
  const readable = book.sections.filter((s) => s.id !== "avaleht");
  const chapters = readable.filter((s) => s.kind === "chapter");
  const openIds = new Set<string>();

  // The introduction is always open, plus one full chapter and one half-open chapter.
  const intro = readable.find((s) => s.id.startsWith("sissejuhatus"));
  if (intro) openIds.add(intro.id);

  const pool = [...chapters];
  const pick = () => {
    if (pool.length === 0) return undefined;
    const idx = Math.floor(Math.random() * pool.length);
    return pool.splice(idx, 1)[0];
  };

  const fullChapter = pick();
  if (fullChapter) openIds.add(fullChapter.id);
  const halfChapter = pick();
  const halfId = halfChapter?.id;

  // Reading-priority order: intro, the full chapter, the half-open one, then the locked rest.
  const ordered = [...readable].sort((a, b) => {
    const rank = (s: (typeof readable)[number]) =>
      s.id.startsWith("sissejuhatus") ? 0 : openIds.has(s.id) ? 1 : s.id === halfId ? 2 : 3;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return readable.indexOf(a) - readable.indexOf(b);
  });

  const sections: PublicSection[] = ordered.map((s) => {
    if (openIds.has(s.id)) {
      return { ...s, locked: false, hiddenBlocks: 0 };
    }

    // Half-open chapter: about half of the real blocks, the rest never leaves the server.
    if (s.id === halfId) {
      const keep = Math.max(1, Math.round(s.blocks.length / 2));
      return {
        id: s.id,
        kind: s.kind,
        label: s.label,
        title: s.title,
        page: s.page,
        words: s.words,
        locked: true,
        partial: true,
        blocks: s.blocks.slice(0, keep),
        hiddenBlocks: Math.max(0, s.blocks.length - keep),
      };
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

/**
 * Full book for entitled readers only: admin, friend account, or a paid purchase.
 * The entitlement is checked server-side; unentitled callers get nothing.
 */
export const getFullBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Sample> => {
    const [rolesRes, paidRes] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      // RLS narrows this to the caller's own purchases (by account or by verified e-mail).
      context.supabase.from("purchases").select("id").eq("status", "paid").limit(1),
    ]);
    const roles = (rolesRes.data ?? []).map((r) => r.role as string);
    const entitled = roles.includes("admin") || roles.includes("friend") || (paidRes.data ?? []).length > 0;
    if (!entitled) throw new Error("Ligipääs puudub");

    const { getBook } = await import("../content/book.server");
    const book = await getBook();
    const readable = book.sections.filter((s) => s.id !== "avaleht");

    return {
      title: book.title,
      author: book.author,
      openCount: readable.length,
      totalChapters: readable.filter((s) => s.kind === "chapter").length,
      sections: readable.map((s) => ({ ...s, locked: false, hiddenBlocks: 0 })),
    };
  });
