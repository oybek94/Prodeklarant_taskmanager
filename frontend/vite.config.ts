import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'

// Mijoz portali (my.prodeklarant.uz) dev rejimida: fayl bo'lmagan har bir yo'l portal.html'ga tushadi
// (SPA fallback). Build'da kerak emas — nginx `try_files $uri /portal.html` qiladi.
const portalDevFallback = (): Plugin => ({
  name: 'portal-dev-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? '/'
      const isAsset = url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/') || /\.[a-z0-9]+(\?|$)/i.test(url)
      if (req.method === 'GET' && !isAsset) req.url = '/portal.html'
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isPortal = mode === 'portal'
  return {
  // Portal'ga xodimlar ilovasining public/ papkasi (tinymce, rasmlar) kirmasin
  ...(isPortal ? { publicDir: 'public-portal' } : {}),
  plugins: [
    tailwindcss(),
    react(),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
    ...(isPortal ? [portalDevFallback()] : []),
  ],
  build: {
    // Mijoz portali xodimlar ilovasidan butunlay alohida bundle (App.tsx, PDF/grafik kutubxonalari kirmaydi)
    ...(isPortal ? { outDir: 'dist-portal' } : {}),
    rolldownOptions: {
      ...(isPortal ? { input: 'portal.html' } : {}),
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
  }
})
