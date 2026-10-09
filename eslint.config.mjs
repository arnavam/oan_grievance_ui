import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),

  // Intentionally-unused variable convention (_ prefix)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "all",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // Architectural boundary rules
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app",      pattern: "src/app/**/*" },
        { type: "feature",  pattern: "src/features/*/**/*", capture: ["featureName"] },
        { type: "shared",   pattern: "src/components/**/*" },
        { type: "contexts", pattern: "src/contexts/**/*" },
        { type: "lib",      pattern: "src/lib/**/*" },
        { type: "store",    pattern: "src/store/**/*" },
        { type: "hooks",    pattern: "src/hooks/**/*" },
        { type: "types",    pattern: "src/types/**/*" },
      ],
      "boundaries/ignore": ["**/*.test.*", "**/*.spec.*"],
    },
    rules: {
      "boundaries/dependencies": ["warn", {
        default: "disallow",
        policies: [
          // app/ can import features, shared, lib, store, contexts, hooks, types
          { 
            from: [{ element: { type: "app" } }], 
            allow: [
              { to: { element: { type: "feature" } } },
              { to: { element: { type: "shared" } } },
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "store" } } },
              { to: { element: { type: "contexts" } } },
              { to: { element: { type: "hooks" } } },
              { to: { element: { type: "types" } } },
            ] 
          },
          // features can import shared, lib, hooks, types, store, contexts, app, and intra-feature
          { 
            from: [{ element: { type: "feature" } }], 
            allow: [
              { to: { element: { type: "shared" } } },
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "hooks" } } },
              { to: { element: { type: "types" } } },
              { to: { element: { type: "store" } } },
              { to: { element: { type: "contexts" } } },
              { to: { element: { type: "app" } } },
              { to: { element: { type: "feature", captured: { featureName: "{{ from.captured.featureName }}" } } } },
            ] 
          },
          // shared components can import shared, lib, contexts, hooks, types, feature, app, store
          { 
            from: [{ element: { type: "shared" } }], 
            allow: [
              { to: { element: { type: "shared" } } },
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "contexts" } } },
              { to: { element: { type: "hooks" } } },
              { to: { element: { type: "types" } } },
              { to: { element: { type: "feature" } } },
              { to: { element: { type: "app" } } },
              { to: { element: { type: "store" } } },
            ] 
          },
          // contexts can import lib, types, store, feature
          { 
            from: [{ element: { type: "contexts" } }], 
            allow: [
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "types" } } },
              { to: { element: { type: "store" } } },
              { to: { element: { type: "feature" } } },
            ] 
          },
          // store registers reducers from features, uses lib and types
          { 
            from: [{ element: { type: "store" } }], 
            allow: [
              { to: { element: { type: "types" } } },
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "feature" } } },
            ] 
          },
          // lib is a foundational layer
          { 
            from: [{ element: { type: "lib" } }], 
            allow: [
              { to: { element: { type: "types" } } },
              { to: { element: { type: "feature" } } },
            ] 
          },
          // hooks can use lib and types
          { 
            from: [{ element: { type: "hooks" } }], 
            allow: [
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "types" } } },
            ] 
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
