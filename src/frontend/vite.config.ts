/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "url";

dotenv.config({ path: "../../.env" });

export default defineConfig({
  root: __dirname,
  base: "./",
  build: {
    outDir: "dist/",
    emptyOutDir: true,
    assetsDir: "assets",
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
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
        // Manual chunking to split large bundles
        manualChunks: {
          // Vendor chunks
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/messaging",
            "firebase/functions",
            "firebase/storage",
          ],
          "vendor-dfinity": ["@dfinity/agent", "@dfinity/auth-client"],
          "vendor-maps": [
            "@react-google-maps/api",
            "@vis.gl/react-google-maps",
          ],
          "vendor-ui": [
            "recharts",
            "react-datepicker",
            "leaflet",
            "react-leaflet",
          ],
        },
      },
      external: ["@rollup/rollup-darwin-x64", "@rollup/rollup-darwin-arm64"],
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
      ignored: ["**/node_modules/**", "**/.git/**"],
      interval: 300,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg", "heroImage.png"],
      injectRegister: "auto",
      manifest: {
        name: "SRV - Your Local Service Hub",
        short_name: "SRV",
        description:
          "Find and book local services with ease on the Internet Computer",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "logo.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "logo.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "logo.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "maskable",
          },
          {
            src: "logo.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        // Exclude very large files from precaching
        globIgnores: ["**/images/main page assets/**", "**/node_modules/**"],
        // Increase maximum file size for caching (5MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Import Firebase Messaging initialization
        importScripts: ["/firebase-messaging-init.js"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
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
