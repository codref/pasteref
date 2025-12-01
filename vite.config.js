import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      customElement: true
    })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Use modern API
        api: 'modern-compiler',
        // Add node_modules to load paths for @use resolution
        loadPaths: ['node_modules']
      }
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer/'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'Pasteref',
      fileName: (format) => `pasteref.${format}.js`
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    copyPublicDir: true
  }
})
