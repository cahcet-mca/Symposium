import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      svgr(),
    ],
    
    server: {
      port: 3000,
      open: true,
      host: true,
    },
    
    build: {
      outDir: 'build',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    // Important: Define env variables for build
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api'),
    },
  };
});