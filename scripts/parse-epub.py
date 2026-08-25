#!/usr/bin/env python3
"""One-off EPUB -> structured JSON extractor for the Metsa Vägi book.

Usage:
    python3 scripts/parse-epub.py <book.epub> <out.json>

Strips the Affinity/InDesign export markup from OEBPS/Story1.xhtml and emits
typed sections the reader can render without an EPUB runtime.
"""
import html
import json
import re
import sys
import zipfile


def clean(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", "", fragment)
    text = html.unescape(text)
    text = text.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip()


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    src, dest = sys.argv[1], sys.argv[2]

    with zipfile.ZipFile(src) as z:
        story = z.read("OEBPS/Story1.xhtml").decode("utf-8", errors="replace")
        opf = z.read("OEBPS/package.opf").decode("utf-8", errors="replace")

    lang_match = re.search(r"<dc:language>([^<]+)</dc:language>", opf)
    language = lang_match.group(1) if lang_match else "et"

    body = story.split("<body>", 1)[1].split("</body>", 1)[0]

    # Walk paragraphs in document order, tracking the current printed page.
    tokens = re.finditer(
        r'<div[^>]*epub:type="pagebreak"[^>]*aria-label="(?P<page>[^"]+)"[^>]*/>'
        r'|<p class="(?P<pclass>[^"]*)">(?P<pbody>.*?)</p>'
        r"|<table[^>]*>(?P<table>.*?)</table>",
        body,
        re.S,
    )

    sections: list[dict] = []
    page = 1
    pending_title = False

    def push_section(**kwargs) -> dict:
        section = {"blocks": [], **kwargs}
        sections.append(section)
        return section

    current = push_section(id="avaleht", kind="front", label="", title="Metsa vägi ja tervis", page=1)

    for tok in tokens:
        if tok.group("page"):
            raw = tok.group("page").strip()
            if raw.isdigit():
                page = int(raw)
            continue

        if tok.group("table") is not None:
            rows = []
            for tr in re.finditer(r"<tr[^>]*>(.*?)</tr>", tok.group("table"), re.S):
                cells = [clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr.group(1), re.S)]
                if any(cells):
                    rows.append(cells)
            if rows:
                current["blocks"].append({"t": "table", "rows": rows})
            continue

        raw_body = tok.group("pbody") or ""
        text = clean(raw_body)
        if not text:
            continue

        spans = re.findall(r'<span class="(span\d+)"', raw_body)
        primary = spans[0] if spans else ""

        # span1 = book/part title, span5 = section heading, span9 = chapter subject,
        # span6 = bold run-in subheading, span3 = body, span4 = colophon, span7 = small.
        if primary == "span5":
            slug = re.sub(r"[^a-z0-9]+", "-", text.lower().replace("ü", "u").replace("ä", "a").replace("õ", "o").replace("ö", "o")).strip("-")
            is_chapter = text.upper().startswith("PEAT")
            current = push_section(
                id=slug or f"osa-{len(sections)}",
                kind="chapter" if is_chapter else "front",
                label=text,
                title=text,
                page=page,
            )
            pending_title = is_chapter
            continue

        if pending_title:
            current["title"] = text
            pending_title = False
            continue

        if primary == "span1":
            current["blocks"].append({"t": "part", "text": text})
            continue

        if primary in ("span6", "span9"):
            current["blocks"].append({"t": "h3", "text": text.rstrip(":")})
            continue

        current["blocks"].append({"t": "p", "text": text})

    sections = [s for s in sections if s["blocks"]]

    for s in sections:
        s["words"] = sum(len(b.get("text", "").split()) for b in s["blocks"] if b["t"] == "p")

    out = {
        "language": language,
        "title": "Metsa vägi ja tervis",
        "author": "Gabriel Corpus",
        "sections": sections,
    }

    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f"{len(sections)} sections -> {dest}")
    print(f"total words: {sum(s['words'] for s in sections)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
