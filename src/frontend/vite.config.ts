/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// Optional bundle analyzer: loaded only when ANALYZE env is set
// We avoid a hard import to keep typecheck simple when the plugin isn't installed in some envs.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let visualizer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore - optional dev dependency not typed in this context
  visualizer = require("rollup-plugin-visualizer").visualizer;
} catch (_) {
  // plugin not installed or not needed
}
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
    target: "es2020",
    cssCodeSplit: true,
    modulePreload: { polyfill: true },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_getters: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      plugins:
        visualizer && process.env.ANALYZE
          ? [
              visualizer({
                filename: "dist/stats.html",
                title: "Bundle Analysis",
                template: "treemap",
                gzipSize: true,
                brotliSize: true,
                open: false,
              }),
            ]
          : [],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "vendor-react";
            if (id.includes("@heroicons")) return "vendor-heroicons";
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("@dfinity")) return "vendor-dfinity";
            if (id.includes("leaflet")) return "vendor-leaflet";
            return "vendor";
          }
        },
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
      external: ["@rollup/rollup-darwin-x64", "@rollup/rollup-darwin-arm64"],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@heroicons/react",
      "firebase/app",
      "firebase/messaging",
      "firebase/auth",
      "firebase/firestore",
      "firebase/analytics",
      "leaflet",
      "react-leaflet",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            //console.log("proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq) => {
            //console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", () => {
            //console.log(
            //  "Received Response from the Target:",
            //  proxyRes.statusCode,
            // req.url,
            //);
          });
        },
      },
    },
    allowedHosts: true,
    // 9/5/2025
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // Cast to any to avoid type conflicts when multiple vite versions are present in monorepo
    environment("all", { prefix: "CANISTER_" }) as unknown as any,
    environment("all", { prefix: "DFX_" }) as unknown as any,
    {
      name: "configure-service-worker",
      configureServer(server) {
        // Serve service workers with correct MIME type
        server.middlewares.use((req, res, next) => {
          if (req.url === "/sw.js" || req.url === "/firebase-messaging-sw.js") {
            res.setHeader(
              "Content-Type",
              "application/javascript; charset=utf-8",
            );
            res.setHeader("Service-Worker-Allowed", "/");
          }
          next();
        });
      },
    },
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
  // @ts-ignore - Allow vitest config block without strict type coupling to vite version
  test: {
    environment: "jsdom",
    setupFiles: "frontend-test-setup.ts",
    globals: true,
  },
});
