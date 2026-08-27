import { defineConfig } from "@lovable.dev/vite-tanstack-config";

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
    ssr: {
      external: ["foliate-js"],
    },
    optimizeDeps: {
      exclude: ["foliate-js"],
    },
  },
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),
});
