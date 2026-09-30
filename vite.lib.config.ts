import { fileURLToPath, URL } from 'node:url'
import { copyFile } from 'node:fs/promises'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  publicDir: false,
  plugins: [
    vue(),
    dts({
      entryRoot: fileURLToPath(new URL('./src', import.meta.url)),
      outDirs: 'document-viewer-vue3/types',
      tsconfigPath: fileURLToPath(new URL('./tsconfig.lib.json', import.meta.url)),
      include: [
        'src/index.ts',
        'src/formats.ts',
        'src/types.ts',
        'src/utif.d.ts',
        'src/components/DocumentViewer.vue',
      ],
    }),
    {
      name: 'copy-library-readme',
      closeBundle() {
        return copyFile(
          fileURLToPath(new URL('./README.md', import.meta.url)),
          fileURLToPath(new URL('./document-viewer-vue3/README.md', import.meta.url)),
        )
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'document-viewer-vue3',
    target: 'es2020',
    copyPublicDir: false,
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'DocumentViewerVue3',
      formats: ['es', 'umd'],
      fileName: format => format === 'es'
        ? 'document-viewer-vue3.js'
        : 'document-viewer-vue3.umd.cjs',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: id => id === 'vue' || id.startsWith('node:'),
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
        chunkFileNames: 'chunks/[name]-[hash].js'
      }
    }
  }
})
