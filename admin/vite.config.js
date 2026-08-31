// admin/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3001,
      open: true,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    // Use ONLY environment variable - NO hardcoded fallback
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
  };
});