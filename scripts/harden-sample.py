#!/usr/bin/env python3
"""Rebuild the public sample JSON from the private full extract.

Usage:
    python scripts/harden-sample.py

Keeps intro + four chapters in full; every other section is a short teaser.
The full extract stays in private/book-et.full.json (gitignored).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FULL = ROOT / "private" / "book-et.full.json"
OUT = ROOT / "src" / "content" / "book-et.json"


def main() -> int:
    book = json.loads(FULL.read_text(encoding="utf-8"))
    chapters = [s for s in book["sections"] if s.get("kind") == "chapter"]
    keep = {s["id"] for s in book["sections"] if str(s.get("id", "")).startswith("sissejuhatus")}
    keep.update(s["id"] for s in chapters[:4])
    keep.add("avaleht")

    out = []
    for s in book["sections"]:
        ns = dict(s)
        if s["id"] in keep:
            ns["complete"] = True
            out.append(ns)
            continue
        first = next((b for b in s.get("blocks", []) if b.get("t") == "p" and len(b.get("text", "")) > 80), None)
        teaser = ""
        if first:
            teaser = ". ".join(first["text"].replace("...", "…").split(". ")[:2])[:340]
        ns["blocks"] = [{"t": "p", "text": teaser}] if teaser else []
        ns["complete"] = False
        out.append(ns)

    book["sections"] = out
    OUT.write_text(json.dumps(book, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes); full chapters={len(keep)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
