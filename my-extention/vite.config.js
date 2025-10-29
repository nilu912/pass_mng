import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"), // your popup React app
        background: resolve(__dirname, "public/background.js"), // background entry
      },
      output: {
        entryFileNames: chunkInfo => {
          // Ensure background builds to root as "background.js"
          if (chunkInfo.name === "background") {
            return "background.js";
          }
          return "assets/[name].js";
        },
      },
    },
  },
});



// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from '@tailwindcss/vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   build: {
//     outDir: "dist",
//     emptyOutDir: true,
//   },
// });
