import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config — needed only to resolve the `@/` alias used everywhere in
 * the app source. Tests live next to their subjects (`*.test.ts`); no separate
 * /tests directory.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub `server-only` — vitest runs in plain Node, no client/server boundary
      "server-only": path.resolve(__dirname, "./src/__test__/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "supabase/functions"],
  },
});
