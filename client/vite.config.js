import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { VitePluginSitemap } from 'vite-plugin-sitemap';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get your Netlify URL (replace with YOUR actual Netlify URL)
  // Example: https://tecno-rendezvous.netlify.app
  const siteUrl = env.VITE_SITE_URL || 'https://YOUR_SITE_NAME.netlify.app';
  
  return {
    plugins: [
      react(),
      svgr(),
      // Sitemap plugin - automatically generates sitemap.xml
      VitePluginSitemap({
        hostname: siteUrl,
        // All the pages Google should know about
        dynamicRoutes: [
          '/',
          '/events',
          '/login',
          '/register',
          '/dashboard',
          '/admin/login',
          '/admin/dashboard'
        ],
        // Change this to today's date in YYYY-MM-DD format
        lastmod: new Date().toISOString().split('T')[0],
        // How often content changes (helps Google know when to recrawl)
        changefreq: {
          '/': 'daily',
          '/events': 'daily',
          '/dashboard': 'weekly',
          '/login': 'weekly',
          '/register': 'weekly',
          '/admin/login': 'monthly',
          '/admin/dashboard': 'daily'
        },
        // Priority (1.0 = most important)
        priority: {
          '/': 1.0,
          '/events': 0.9,
          '/dashboard': 0.8,
          '/register': 0.7,
          '/login': 0.7,
          '/admin/dashboard': 0.6,
          '/admin/login': 0.5
        }
      })
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
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
    },
  };
});