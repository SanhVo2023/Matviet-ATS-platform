import { defineConfig } from "drizzle-kit";

// Used only for `drizzle-kit generate` (SQL emission into migrations-d1/).
// Applying migrations is wrangler's job: `wrangler d1 migrations apply matviet-hr`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations-d1",
});
