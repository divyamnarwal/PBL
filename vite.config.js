import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'public',
  publicDir: false, // Disable publicDir since root is already public
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        login: resolve(__dirname, 'public/login.html'),
        signup: resolve(__dirname, 'public/signup.html'),
        dashboard: resolve(__dirname, 'public/dashboard.html'),
        recommendations: resolve(__dirname, 'public/recommendations.html'),
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '@src': resolve(__dirname, 'src'),
      // Resolve /js and /src imports from project root (not public folder)
      '/js': resolve(__dirname, 'js'),
      '/src': resolve(__dirname, 'src')
    }
  }
});
