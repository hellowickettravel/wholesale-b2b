import { defineConfig } from "vitest/config";
import path from "node:path";

// Security tests run against the local Supabase stack (npm run db:start && npm run db:reset).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/security/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
