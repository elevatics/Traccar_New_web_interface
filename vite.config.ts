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
}));
