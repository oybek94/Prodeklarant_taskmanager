import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // MUHIM: og'ir/sahifaga-xos kutubxonalarni keng 'react' qoidasidan OLDIN tekshiramiz.
          // @react-pdf (og'ir, faqat invoice'da) ilgari 'react' bilan mos kelib eager
          // vendor-react'ga tushib qolardi — endi alohida, faqat kerak bo'lganda yuklanadi.
          if (id.includes('@react-pdf') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('apexcharts') || id.includes('chart.js') || id.includes('chartjs') || id.includes('recharts')) return 'vendor-charts';
          if (id.includes('@tiptap') || id.includes('tinymce')) return 'vendor-editor';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('framer-motion') || id.includes('@iconify')) return 'vendor-ui';
          // React YADROSI — faqat aniq paketlar (react-* o'rovchilar bu yerga tushmaydi).
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
