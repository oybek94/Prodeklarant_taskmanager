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
    rolldownOptions: {
      output: {
        // Rolldown: har guruh o'z modullarining bog'liqliklarini ham "tortib oladi".
        // Oldingi manualChunks'da React yadrosi grafik/PDF chunk'lariga tushib qolardi va
        // shu sabab har sahifada og'ir grafik kutubxonalari yuklanardi. Endi React guruhi
        // eng yuqori ustuvorlikda — uni hech kim tortib ololmaydi.
        codeSplitting: {
          groups: [
            // React YADROSI — faqat aniq paketlar (react-* o'rovchilar bu yerga tushmaydi).
            { name: 'vendor-react', test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//, priority: 100 },
            // Og'ir/sahifaga-xos kutubxonalar — faqat kerak bo'lganda yuklanadi.
            { name: 'vendor-pdf', test: /node_modules\/(@react-pdf|jspdf|html2canvas)/, priority: 50 },
            // Grafiklar alohida: dashboard faqat chart.js ishlatadi, ApexCharts/Recharts'ni yuklamasin.
            { name: 'vendor-apexcharts', test: /node_modules\/(apexcharts|react-apexcharts)\//, priority: 40 },
            { name: 'vendor-recharts', test: /node_modules\/(recharts|victory-vendor|d3-[^/]+)\//, priority: 40 },
            { name: 'vendor-charts', test: /node_modules\/(chart\.js|chartjs-[^/]+|react-chartjs-2)\//, priority: 40 },
            { name: 'vendor-editor', test: /node_modules\/(@tiptap|tinymce)/, priority: 30 },
            { name: 'vendor-xlsx', test: /node_modules\/xlsx/, priority: 30 },
            { name: 'vendor-ui', test: /node_modules\/(framer-motion|@iconify)/, priority: 30 },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
