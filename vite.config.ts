import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { copyPrivateBooksIntoServerOutput } from "./src/lib/copy-books-output.ts";

// Lovable's wrapper defaults Nitro to cloudflare-module. Pin vercel on Vercel
// builds (VERCEL=1) so Functions get the right output. NITRO_PRESET still wins
// for Podman (node-server) and local overrides.
const nitroPreset = process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : undefined);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    ssr: {
      external: ["foliate-js"],
    },
    optimizeDeps: {
      exclude: ["foliate-js"],
    },
  },
  nitro: {
    ...(nitroPreset ? { preset: nitroPreset } : {}),
    // Gitignored EPUBs in private/books — bundled into the server, never public/.
    // Cast: Lovable's nitro type only lists preset/output/cloudflare; extra fields still reach Nitro.
    serverAssets: [
      {
        baseName: "books",
        dir: "./private/books",
        pattern: "*.epub",
      },
    ],
    hooks: {
      compiled() {
        copyPrivateBooksIntoServerOutput();
      },
    },
  } as { preset?: string },
});
