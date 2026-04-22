import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const versionManifestPath = [
  path.resolve(__dirname, "../package.json"),
  path.resolve(__dirname, "./package.json"),
].find((candidate) => fs.existsSync(candidate))

if (!versionManifestPath) {
  throw new Error("Could not find a package.json to resolve the app version.")
}

const packageJson = JSON.parse(
  fs.readFileSync(versionManifestPath, "utf8"),
) as { version: string }
const appVersion = process.env.VITE_APP_VERSION ?? packageJson.version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
})
