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
  chunkSizeWarningLimit: 1000,

  rollupOptions: {
    output: {
      manualChunks(id) {
        const normalId = id.replace(/\\/g, "/");
        if (!normalId.includes("/node_modules/")) return;

        if (normalId.includes("/node_modules/plotly.js/") || normalId.includes("/node_modules/react-plotly.js/")) {
          return "vendor-plotly";
        }
        if (normalId.includes("/node_modules/mapbox-gl/")) {
          return "vendor-mapbox";
        }
        if (
          normalId.includes("/node_modules/recharts/") ||
          normalId.includes("/node_modules/d3-") ||
          normalId.includes("/node_modules/victory-vendor/")
        ) {
          return "vendor-charts";
        }
        if (normalId.includes("/node_modules/lucide-react/")) {
          return "vendor-lucide";
        }

        // Everything else (react, react-dom, react-router, radix, tanstack,
        // next-themes, sonner, scheduler, etc.) goes into ONE chunk so there
        // is no cross-chunk load-order dependency on React being ready.
        return "vendor";
      },
    },
  },
},
}));
