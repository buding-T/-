import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // 监听 0.0.0.0，允许同一局域网内其他设备通过 IP 访问
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
});
