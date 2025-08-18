/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";

dotenv.config({ path: "../../.env" });

export default defineConfig({
  root: __dirname,
  base: "./",
  build: {
    outDir: "dist/",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep original structure for images and fonts
          if (assetInfo.name?.match(/\.(png|jpe?g|svg|gif|webp)$/)) {
            return "images/[name][extname]";
          }
          if (assetInfo.name?.match(/\.(woff2?|eot|ttf|otf)$/)) {
            return "fonts/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq, req) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
    allowedHosts: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "frontend-test-setup.ts",
    globals: true,
  },
});
