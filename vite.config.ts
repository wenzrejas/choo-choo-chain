import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => {
  const base = command === "build" ? "/choo-choo-chain/" : "./";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "generateSW",
        injectRegister: null,
        registerType: "autoUpdate",
        scope: "/choo-choo-chain/",
        base: "/choo-choo-chain/",
        manifest: {
          name: "Choo Choo Chain",
          short_name: "Choo Choo",
          description:
            "A fast-paced 3D train survival game. Collect wagons, dodge obstacles, and chain your way to the top score!",
          start_url: "/choo-choo-chain/",
          scope: "/choo-choo-chain/",
          display: "standalone",
          background_color: "#1a0a00",
          theme_color: "#c0440a",
          icons: [
            {
              src: "/choo-choo-chain/android-chrome-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/choo-choo-chain/android-chrome-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "/choo-choo-chain/index.html",
          navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
          globPatterns: [
            "assets/**/*.{js,css}",
            "index.html",
            "sounds/*.mp3",
            "models/**/*.{glb,png}",
            "*.{png,jpg,svg,webmanifest}",
          ],
          // bgm.mp3 (~3.02 MB) and logo.png (~2.22 MB) exceed Workbox's 2 MB default
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                cacheableResponse: { statuses: [0, 200] },
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      open: true,
    },
    build: {
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
