import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://elevaticsiot.com/",
        changeOrigin: true,
        secure: false,
      },
      "/vps-api": {
        target: "http://15.204.117.106:8090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vps-api/, "/api"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const key = process.env.VITE_VPS_API_KEY;
            if (key && !proxyReq.getHeader("x-vps-api-key")) {
              proxyReq.setHeader("x-vps-api-key", key);
            }
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Work around broken dequal package entry resolution in this environment.
      dequal: path.resolve(__dirname, "./node_modules/dequal/dist/index.js"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Plotly — very large (~3 MB), split first
          if (id.includes("node_modules/plotly.js") || id.includes("node_modules/react-plotly.js")) {
            return "vendor-plotly";
          }
          // Mapbox GL
          if (id.includes("node_modules/mapbox-gl")) {
            return "vendor-mapbox";
          }
          // Recharts + d3 deps
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3") ||
            id.includes("node_modules/victory-vendor")
          ) {
            return "vendor-charts";
          }
          // Lucide icons
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          // Radix UI primitives
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          // React core
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          // React Router
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "vendor-router";
          }
          // TanStack Query
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          // Everything else in node_modules goes to a general vendor chunk
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        },
      },
    },
    // Raise the chunk warning threshold so CI isn't noisy for known large vendors
    chunkSizeWarningLimit: 1000,
  },
}));
