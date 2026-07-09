import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

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
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "GraphGiraffeReact",
      formats: ["es", "cjs"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom", "@graph-giraffe/core"],
    },
  },
});
