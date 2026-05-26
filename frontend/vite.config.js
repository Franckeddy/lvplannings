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
        manualChunks: {
          'vue-vendor': ['vue'],
          'primevue-vendor': ['primevue/config', '@primeuix/themes/aura'],
          'primevue-components': [
            'primevue/button',
            'primevue/select',
            'primevue/inputtext',
            'primevue/textarea',
            'primevue/dialog',
            'primevue/datatable',
            'primevue/column',
            'primevue/fileupload',
            'primevue/card',
            'primevue/tag',
            'primevue/tabview',
            'primevue/tabpanel'
          ],
          'axios': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
