import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        login: resolve(__dirname, 'public/login.html'),
        signup: resolve(__dirname, 'public/signup.html'),
        dashboard: resolve(__dirname, 'public/dashboard.html'),
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js')
    }
  }
});
