import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { cookieNames, readBookToken, readEntitlement } from "@/lib/access";
import { freeAccessEmail, freeAccessEnabled } from "@/lib/free-access";
import { loadEpubBytes } from "@/lib/book-file.server";

export const Route = createFileRoute("/api/book")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("t");
        const cookie = getCookie(cookieNames().COOKIE);
        let email = (await readBookToken(token)) || (await readEntitlement(cookie))?.email;
        if (!email && freeAccessEnabled()) email = freeAccessEmail();
        if (!email) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!freeAccessEnabled()) {
          const { getActiveReader } = await import("@/lib/admin-store.server");
          if (!(await getActiveReader(email))) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const bytes = await loadEpubBytes();
        if (!bytes) {
          return new Response("Book unavailable", { status: 503 });
        }

        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        return new Response(copy.buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/epub+zip",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": 'inline; filename="metsa-vagi.epub"',
          },
        });
      },
    },
  },
});
