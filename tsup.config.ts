import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  outDir: "build",
  format: ["cjs"],
  target: "es2022",
  clean: true,
  tsconfig: "./tsconfig.json",
});
