import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['apexcharts', 'react-apexcharts', 'chart.js', 'recharts', 'react-chartjs-2'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-ui': ['framer-motion', 'lucide-react', '@iconify/react'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
