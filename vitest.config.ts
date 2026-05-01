import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "node_modules/.cache/vitest",
  test: {
    globals: true,
    environment: "node",
    server: {
      deps: {
        // Force vitest to transform our CommonJS source so vi.mock()
        // intercepts the require() calls inside lib/ and bin/.
        inline: [/\/lib\//, /\/bin\//],
      },
    },
    include: ["__tests__/**/*.test.js"],
    exclude: [
      // Standard ignores — not source code we author or test.
      "**/node_modules/**",
      "**/coverage/**",
    ],
    coverage: {
      provider: "v8",
      // v4 has AST-aware remapping built in — no flag needed.
      reporter: ["text", "html"],
      include: ["bin/**/*.js", "lib/**/*.js"],
      exclude: [
        // Test files themselves should never count toward coverage.
        "**/__tests__/**",
        "**/*.test.js",
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
