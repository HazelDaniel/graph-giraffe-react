import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";
import { cpSync, mkdirSync } from "node:fs";

function copyCoreAssets() {
  return {
    name: "copy-core-assets",
    closeBundle() {
      mkdirSync(resolve(__dirname, "dist/assets"), { recursive: true });

      cpSync(
        resolve(__dirname, "node_modules/@graph-giraffe/core/assets/index.css"),
        resolve(__dirname, "dist/assets/index.css")
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    dts({
      tsconfigPath: resolve(__dirname, "tsconfig.app.json"),
      rollupTypes: true,
      insertTypesEntry: true,
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        allowImportingTsExtensions: false,
      },
    }),
    copyCoreAssets(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "GraphGiraffeReact",
      formats: ["es", "cjs"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@graph-giraffe/core",
      ],
    },
  },
});
