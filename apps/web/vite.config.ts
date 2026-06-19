import react from "@vitejs/plugin-react";
import pxtorem from "postcss-pxtorem";
import { defineConfig } from "vite";

export default defineConfig({
  root: "apps/web",
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        pxtorem({
          exclude: (filePath: string) => !filePath.includes("ConsumerMobilePage.css"),
          mediaQuery: false,
          minPixelValue: 1,
          propList: ["*"],
          rootValue: 75,
          unitPrecision: 5
        })
      ]
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    }
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true
  }
});
