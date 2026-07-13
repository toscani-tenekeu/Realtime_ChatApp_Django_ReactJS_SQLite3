import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    // Keep Vite's host protection enabled; add temporary tunnel domains via
    // VITE_ALLOWED_HOSTS instead of disabling the check globally.
    allowedHosts: (process.env.VITE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean),
    // When Vite is behind an HTTPS tunnel (for example ngrok), the browser
    // must connect to the tunnel's secure WebSocket endpoint for HMR.
    ...(process.env.VITE_HMR_HOST
      ? {
          hmr: {
            protocol: "wss",
            host: process.env.VITE_HMR_HOST,
            clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? 443),
          },
        }
      : {}),
  },
});
