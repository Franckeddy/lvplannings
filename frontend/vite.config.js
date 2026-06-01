import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@vue/') || id.includes('node_modules/vue/')) {
            return 'vue-vendor';
          }
          if (id.includes('node_modules/@primeuix/themes') || id.includes('node_modules/primevue/config')) {
            return 'primevue-vendor';
          }
          if (id.includes('node_modules/primevue/')) {
            return 'primevue-components';
          }
          if (id.includes('node_modules/axios/')) {
            return 'axios';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
