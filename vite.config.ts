import { defineConfig } from "vite";
import path from "path";
import alias from "@rollup/plugin-alias";
import autoprefixer from "autoprefixer";

export default defineConfig({
  base: "/Chess_Younes-Lahouiti/",
  plugins: [
    alias({
      entries: [
        { find: "@public", replacement: path.resolve(__dirname, "public") },
        { find: "@assets", replacement: path.resolve(__dirname, "src/assets") },
        {
          find: "@components",
          replacement: path.resolve(__dirname, "src/components"),
        },
        { find: "@pages", replacement: path.resolve(__dirname, "src/pages") },
        { find: "@utils", replacement: path.resolve(__dirname, "src/utils") },
        { find: "@sass", replacement: path.resolve(__dirname, "src/sass") },
      ],
    }),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "src/index.ts"),
        style: path.resolve(__dirname, "src/sass/main.scss"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    minify: "terser",
  },
  resolve: {
    alias: {
      "@public": path.resolve(__dirname, "public"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@sass": path.resolve(__dirname, "src/sass"),
    },
    extensions: [".ts", ".js"],
  },
});
