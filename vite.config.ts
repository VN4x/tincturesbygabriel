import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitroPreset = process.env["NITRO_PRESET"];

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
