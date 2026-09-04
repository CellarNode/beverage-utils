import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // React-hook tests (`__tests__/react/**`) opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock — the plain-logic suites (e.g.
    // `country.test.ts`, which resolves `import.meta.url` to a `file://`
    // URL) rely on the default node environment and break under jsdom.
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
  },
});
