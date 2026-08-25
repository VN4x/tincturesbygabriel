# Open chapters first + three author portrait mockups

## a) Show open chapters right after "Sissejuhatus"

Feasible and simple. The reader already receives sections from the server (`src/lib/book.functions.ts`) and renders them in book order (`src/routes/lugemine.tsx`), so a chapter opened at random — say chapter 28 — sits far down the page.

Change: the server keeps its random pick, but returns sections in reading-priority order:

1. Sissejuhatus (always open)
2. the randomly opened chapters, in book order among themselves
3. all locked chapters, in original book order

Details:
- Reordering happens once on the server, so the contents rail, the scroll order and the active-section highlight all stay consistent with what is shown.
- Each open chapter keeps its real chapter label and page number, so the reader still knows where in the book it is ("Peatükk 28 · lk 112").
- A small divider line after the open block marks where the locked remainder begins, with the existing "Lukus" wording — no new copy needed beyond one label in the ET/EN dictionary.
- "Reshuffle the sample" keeps working: a new pick re-sorts the same way.

## b) Three portrait mockups (files only, not placed on the page)

Generate three variants of Gabriel Corpus, slightly more photorealistic than the current painted portrait, same face and identity, black hair, amber tincture bottle motif kept where it fits:

- `src/assets/mock/gabriel-20s.jpg` — early twenties
- `src/assets/mock/gabriel-30s.jpg` — early thirties
- `src/assets/mock/gabriel-45.jpg` — 45–50, faint gray at the temples

They are saved as assets only; no route, section or import references them, so the live site is unchanged. You can view them in the file tree and tell me which one to use where.

## Technical notes

- Only two files change for (a): `src/lib/book.functions.ts` (ordering) and one dictionary entry in `src/lib/i18n.tsx`. The reader component needs no logic change since it renders the server order.
- Locked text stays truncated server-side; reordering does not weaken that.
