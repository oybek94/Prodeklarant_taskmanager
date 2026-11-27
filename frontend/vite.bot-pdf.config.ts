import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// Mijoz guruhiga yuboriladigan invoys PDF'ini serverda chizadigan mustaqil dastur
// (dist-bot-pdf/invoice-pdf.mjs + fonts/). Serverda node_modules kerak emas: hammasi ichida.

const file = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

const copyFonts = (): Plugin => ({
  name: 'bot-pdf-fonts',
  closeBundle() {
    cpSync(file('./public/fonts'), file('./dist-bot-pdf/fonts'), { recursive: true })
  },
})

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: [
      // Brauzerga xos ikki modul Node variantiga almashtiriladi
      { find: /^.*\/lib\/api$/, replacement: file('./server-pdf/apiStub.ts') },
      { find: /^.*\/pdf\/fonts$/, replacement: file('./server-pdf/fonts.node.ts') },
    ],
  },
  // Ishlab chiqarish rejimi React'ning dev tekshiruvlarini o'chiradi
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  ssr: { noExternal: true },
  plugins: [copyFonts()],
  build: {
    ssr: file('./server-pdf/cli.ts'),
    outDir: 'dist-bot-pdf',
    emptyOutDir: true,
    target: 'node20',
    rolldownOptions: {
      output: { format: 'es', entryFileNames: 'invoice-pdf.mjs' },
    },
  },
})
