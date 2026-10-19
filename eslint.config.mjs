/**
 * Configuración de ESLint: reglas de Next (Core Web Vitals y TypeScript).
 *
 * @module
 */

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Reglas de Next más los ignores por defecto. */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Documentación generada por TypeDoc (npm run docs).
    "api-docs/**",
  ]),
]);

export default eslintConfig;
