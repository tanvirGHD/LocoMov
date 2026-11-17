import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const serverEnvPath = fileURLToPath(new URL('../server/.env', import.meta.url));
let serverPort = Number(process.env.PORT) || 5001;
if (!process.env.PORT) {
  try {
    const portSetting = readFileSync(serverEnvPath, 'utf8').match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (portSetting) serverPort = Number(portSetting[1]);
  } catch {
    // Keep the documented default when server/.env has not been created yet.
  }
}
const apiTarget = `http://127.0.0.1:${serverPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
      '/socket.io': {
        target: apiTarget,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'map-vendor';
          if (id.includes('recharts') || id.includes('/d3-')) return 'chart-vendor';
          if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
});
