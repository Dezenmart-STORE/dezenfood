import { defineConfig, loadEnv, type Plugin } from "vite";
import brandDefaults from "./src/config/brand.defaults.json";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Fills __BRAND_*__ tokens in index.html (and public/manifest.json via the PWA
 * manifest below) from src/config/brand.defaults.json, overridable with
 * VITE_BRAND_* / VITE_SITE_URL env vars. Same source as src/config/brand.ts.
 */
function brandTokens(env: Record<string, string>) {
  const pick = (k: string, d: string) => (env[k] || d).trim();
  return {
    name: pick("VITE_BRAND_NAME", brandDefaults.name),
    tagline: pick("VITE_BRAND_TAGLINE", brandDefaults.tagline),
    description: pick("VITE_BRAND_DESCRIPTION", brandDefaults.description),
    siteUrl: pick("VITE_SITE_URL", brandDefaults.siteUrl).replace(/\/$/, ""),
    supportEmail: pick("VITE_SUPPORT_EMAIL", brandDefaults.supportEmail),
    twitter: pick("VITE_BRAND_TWITTER", brandDefaults.twitterHandle),
    twitterUrl: pick("VITE_BRAND_TWITTER_URL", brandDefaults.twitterUrl),
    linkedinUrl: pick("VITE_BRAND_LINKEDIN_URL", brandDefaults.linkedinUrl),
    legalName: pick("VITE_BRAND_LEGAL_NAME", brandDefaults.legalName),
    primary: brandDefaults.primary,
    background: brandDefaults.background,
  };
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function brandHtml(env: Record<string, string>): Plugin {
  const b = brandTokens(env);
  const map: Record<string, string> = {
    __BRAND_NAME__: b.name,
    __BRAND_NAME_UPPER__: b.name.toUpperCase(),
    __BRAND_TAGLINE__: b.tagline,
    __BRAND_DESCRIPTION__: b.description,
    __SITE_URL__: b.siteUrl,
    __SUPPORT_EMAIL__: b.supportEmail,
    __BRAND_TWITTER__: b.twitter,
    __BRAND_TWITTER_URL__: b.twitterUrl,
    __BRAND_LINKEDIN_URL__: b.linkedinUrl,
    __BRAND_LEGAL_NAME__: b.legalName,
    __BRAND_PRIMARY__: b.primary,
    __BRAND_BACKGROUND__: b.background,
  };
  return {
    name: "brand-html",
    transformIndexHtml(html) {
      return html.replace(/__[A-Z_]+__/g, (t) => (t in map ? escapeAttr(map[t]) : t));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const brand = brandTokens(env);
  return {
  plugins: [
    react(),
    brandHtml(env),
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    // PWA Plugin — injectManifest so src/sw.ts handles push + caching
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["robots.txt", "icons/*.png", "images/logo.svg", "images/logo.png"],
      manifest: {
        name: `${brand.name} - ${brand.tagline}`,
        short_name: brand.name,
        description: brand.description,
        theme_color: brand.primary,
        background_color: brand.background,
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        // Headroom above the largest emitted chunk (the main index chunk is
        // ~4.2 MB) so injectManifest can precache every asset without erroring.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        globIgnores: ["**/stats.html", "**/node_modules/**"],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
    // Bundle analyzer (only in analyze mode) - conditionally included
    ...(process.env.ANALYZE === "true"
      ? [
          visualizer({
            open: true,
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
          }) as any,
        ]
      : []),
  ],
  server: {
    host: true,
    allowedHosts: ["footer-finer-immobile.ngrok-free.dev"]
  },
  resolve: {
    alias: {
      "@selfxyz/common/utils/appType": "@selfxyz/core",
      "@": "/src",
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    include: [
      "@uniswap/sdk-core",
      "@uniswap/v3-sdk",
      "@uniswap/smart-order-router",
    ],
  },
  build: {
    // Target modern browsers for smaller bundles
    target: "es2020",

    // Source maps are disabled in the build: generating them roughly doubles
    // peak memory during "rendering chunks", which OOM-killed the Netlify build
    // once the Dynamic SDK was added. Re-enable ("hidden") only on a larger
    // build instance, or upload + strip maps via the Sentry vite plugin.
    sourcemap: false,

    // Increase chunk size warning limit (Web3 libraries are large)
    chunkSizeWarningLimit: 1000,

    // Optimize build performance
    reportCompressedSize: false, // Disable gzip reporting to save memory
    modulePreload: {
      polyfill: false, // Reduce polyfill overhead
    },

    rollupOptions: {
      external: [],
      output: {
        // NO manualChunks. This was a hard-won lesson: every hand-drawn chunk
        // boundary through the web3/crypto graph broke module init at boot,
        // three different ways -
        //   1. `Cannot access 'og' before initialization` - splitting
        //      walletconnect off from its cyclic ESM deps (TDZ live-binding).
        //   2. `Cannot access 'Ea' before initialization` - same, splitting
        //      uniswap off.
        //   3. `Object.defineProperty called on non-object` - splitting
        //      @selfxyz off from the CommonJS ethers modules it require()s
        //      (cross-chunk CJS exports not initialized yet).
        // walletconnect/reown/ox/wagmi/viem/uniswap/ethers/mento/@selfxyz form
        // one deeply interdependent ESM+CJS graph. Rollup's automatic chunker
        // co-locates cyclic groups and commonjs proxies correctly, so it never
        // produces these init-order bugs - only manual overrides do. The build's
        // peak memory is controlled by `sourcemap: false` + esbuild minify
        // (above), NOT by manual chunking, so letting Rollup chunk automatically
        // costs nothing on memory and removes the entire class of boot crash.
        // Lazy routes/components still split into their own async chunks via
        // dynamic import().

        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()
            : "chunk";
          return `assets/js/[name]-[hash].js`;
        },

        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },

      onwarn(warning, warn) {
        if (
          warning.code === "MISSING_EXPORT" &&
          warning.message.includes("@selfxyz/qrcode") &&
          warning.message.includes("SelfApp")
        ) {
          return;
        }
        warn(warning);
      },
    },

    commonjsOptions: {
      transformMixedEsModules: true,
      ignoreTryCatch: true, // Prevent issues with try-catch detection
    },

    // esbuild minify uses far less memory than terser (which OOM-killed the
    // Netlify build after the Dynamic SDK was added). Console/debugger removal
    // is handled by `esbuild.drop` below - same effect as terser drop_console.
    minify: "esbuild",
  },

  esbuild: {
    // Strip noisy logs but KEEP console.error and console.warn.
    //
    // This used to be `drop: ["console"]`, which removes EVERY console call in
    // production. That made real failures completely invisible: a wallet error
    // caught by a library ErrorBoundary, a failed payment, a thrown render - all
    // silent, with nothing in the console to go on. It also silently disabled
    // the app's own payment debugger (utils/debug), whose entire output is
    // console-based, so enablePaymentDebug()/printPaymentDebug() printed nothing
    // in the only build where they matter.
    //
    // A first attempt kept only error/warn and dropped console.log via `pure`.
    // That still broke the debug tooling: paymentDebugger prints with
    // console.log/console.table, so enablePaymentDebug() + printPaymentDebug()
    // produced nothing and looked like the function was returning undefined.
    // Console output is worth far more than the handful of KB it costs in a
    // multi-megabyte bundle, so nothing is stripped now except `debugger`.
    drop: ["debugger"],
  },
};
});
