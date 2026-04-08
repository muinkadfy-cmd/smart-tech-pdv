import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
var currentDir = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(currentDir, "./src")
        }
    },
    server: {
        port: 1420,
        strictPort: true
    },
    preview: {
        port: 4173,
        strictPort: true
    },
    clearScreen: false
});
