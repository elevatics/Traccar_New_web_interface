// vite.config.ts
import { defineConfig } from "file:///D:/Lizmotors/vehicle_telematics_end_to_end/Traccar_New_web_interface/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Lizmotors/vehicle_telematics_end_to_end/Traccar_New_web_interface/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/Lizmotors/vehicle_telematics_end_to_end/Traccar_New_web_interface/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "D:\\Lizmotors\\vehicle_telematics_end_to_end\\Traccar_New_web_interface";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://elevaticsiot.com/",
        changeOrigin: true,
        secure: false
      },
      "/vps-api": {
        target: "http://15.204.117.106:8090",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/vps-api/, "/api"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const key = process.env.VITE_VPS_API_KEY;
            if (key && !proxyReq.getHeader("x-vps-api-key")) {
              proxyReq.setHeader("x-vps-api-key", key);
            }
          });
        }
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      // Work around broken dequal package entry resolution in this environment.
      dequal: path.resolve(__vite_injected_original_dirname, "./node_modules/dequal/dist/index.js")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/plotly.js") || id.includes("node_modules/react-plotly.js")) {
            return "vendor-plotly";
          }
          if (id.includes("node_modules/mapbox-gl")) {
            return "vendor-mapbox";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3") || id.includes("node_modules/victory-vendor")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        }
      }
    },
    // Raise the chunk warning threshold so CI isn't noisy for known large vendors
    chunkSizeWarningLimit: 1e3
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxMaXptb3RvcnNcXFxcdmVoaWNsZV90ZWxlbWF0aWNzX2VuZF90b19lbmRcXFxcVHJhY2Nhcl9OZXdfd2ViX2ludGVyZmFjZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcTGl6bW90b3JzXFxcXHZlaGljbGVfdGVsZW1hdGljc19lbmRfdG9fZW5kXFxcXFRyYWNjYXJfTmV3X3dlYl9pbnRlcmZhY2VcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0xpem1vdG9ycy92ZWhpY2xlX3RlbGVtYXRpY3NfZW5kX3RvX2VuZC9UcmFjY2FyX05ld193ZWJfaW50ZXJmYWNlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vZWxldmF0aWNzaW90LmNvbS9cIixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgXCIvdnBzLWFwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xNS4yMDQuMTE3LjEwNjo4MDkwXCIsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC92cHMtYXBpLywgXCIvYXBpXCIpLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbihcInByb3h5UmVxXCIsIChwcm94eVJlcSwgcmVxKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IHByb2Nlc3MuZW52LlZJVEVfVlBTX0FQSV9LRVk7XHJcbiAgICAgICAgICAgIGlmIChrZXkgJiYgIXByb3h5UmVxLmdldEhlYWRlcihcIngtdnBzLWFwaS1rZXlcIikpIHtcclxuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoXCJ4LXZwcy1hcGkta2V5XCIsIGtleSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgICAvLyBXb3JrIGFyb3VuZCBicm9rZW4gZGVxdWFsIHBhY2thZ2UgZW50cnkgcmVzb2x1dGlvbiBpbiB0aGlzIGVudmlyb25tZW50LlxyXG4gICAgICBkZXF1YWw6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvZGVxdWFsL2Rpc3QvaW5kZXguanNcIiksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICAvLyBQbG90bHkgXHUyMDE0IHZlcnkgbGFyZ2UgKH4zIE1CKSwgc3BsaXQgZmlyc3RcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9wbG90bHkuanNcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvcmVhY3QtcGxvdGx5LmpzXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1wbG90bHlcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIE1hcGJveCBHTFxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL21hcGJveC1nbFwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItbWFwYm94XCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBSZWNoYXJ0cyArIGQzIGRlcHNcclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvcmVjaGFydHNcIikgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvZDNcIikgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvdmljdG9yeS12ZW5kb3JcIilcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItY2hhcnRzXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBMdWNpZGUgaWNvbnNcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3RcIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWx1Y2lkZVwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gUmFkaXggVUkgcHJpbWl0aXZlc1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL0ByYWRpeC11aVwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItcmFkaXhcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFJlYWN0IGNvcmVcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdFwiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1kb21cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJlYWN0XCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBSZWFjdCBSb3V0ZXJcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXJcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvQHJlbWl4LXJ1blwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3Itcm91dGVyXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBUYW5TdGFjayBRdWVyeVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL0B0YW5zdGFja1wiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItcXVlcnlcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiBub2RlX21vZHVsZXMgZ29lcyB0byBhIGdlbmVyYWwgdmVuZG9yIGNodW5rXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1pc2NcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIC8vIFJhaXNlIHRoZSBjaHVuayB3YXJuaW5nIHRocmVzaG9sZCBzbyBDSSBpc24ndCBub2lzeSBmb3Iga25vd24gbGFyZ2UgdmVuZG9yc1xyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzWSxTQUFTLG9CQUFvQjtBQUNuYSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNWLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBU0EsTUFBSyxRQUFRLGNBQWMsTUFBTTtBQUFBLFFBQ3BELFdBQVcsQ0FBQyxVQUFVO0FBQ3BCLGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsUUFBUTtBQUN0QyxrQkFBTSxNQUFNLFFBQVEsSUFBSTtBQUN4QixnQkFBSSxPQUFPLENBQUMsU0FBUyxVQUFVLGVBQWUsR0FBRztBQUMvQyx1QkFBUyxVQUFVLGlCQUFpQixHQUFHO0FBQUEsWUFDekM7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDOUUsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBO0FBQUEsTUFFcEMsUUFBUSxLQUFLLFFBQVEsa0NBQVcscUNBQXFDO0FBQUEsSUFDdkU7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFFZixjQUFJLEdBQUcsU0FBUyx3QkFBd0IsS0FBSyxHQUFHLFNBQVMsOEJBQThCLEdBQUc7QUFDeEYsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDekMsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FDRSxHQUFHLFNBQVMsdUJBQXVCLEtBQ25DLEdBQUcsU0FBUyxpQkFBaUIsS0FDN0IsR0FBRyxTQUFTLDZCQUE2QixHQUN6QztBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDJCQUEyQixHQUFHO0FBQzVDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLHdCQUF3QixHQUFHO0FBQ3pDLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLG9CQUFvQixLQUFLLEdBQUcsU0FBUyx3QkFBd0IsR0FBRztBQUM5RSxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUywyQkFBMkIsS0FBSyxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDdEYsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDekMsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
