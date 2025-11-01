import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.cdc'],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'fcl': ['@onflow/fcl', '@onflow/types'],
        },
      },
      external: [],
      preserveEntrySignatures: 'strict',
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Use default esbuild minifier (faster and included)
    // minify: 'terser', // Requires terser package
  },
  optimizeDeps: {
    include: ['@onflow/fcl', '@onflow/types'],
    exclude: [],
  },
  resolve: {
    dedupe: ['@onflow/fcl', '@onflow/types'],
  },
})
