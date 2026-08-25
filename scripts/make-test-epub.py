#!/usr/bin/env python3
"""Write a tiny EPUB3 to BOOK_PATH / argv[1]. Never commit the file."""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""

PACKAGE = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:metsa-vagi-e2e</dc:identifier>
    <dc:title>Metsa vägi e2e</dc:title>
    <dc:language>et</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>
"""

NAV = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="et">
  <head><title>Sisukord</title></head>
  <body>
    <nav epub:type="toc"><ol><li><a href="ch1.xhtml">Proov</a></li></ol></nav>
  </body>
</html>
"""

CH1 = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="et">
  <head><title>Proov</title></head>
  <body><h1>Metsa vägi</h1><p>E2E peatükk pärast makset.</p></body>
</html>
"""


def main() -> None:
    dest = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mv-e2e-book.epub")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("EPUB/package.opf", PACKAGE)
        zf.writestr("EPUB/nav.xhtml", NAV)
        zf.writestr("EPUB/ch1.xhtml", CH1)
    print(dest)


if __name__ == "__main__":
    main()
