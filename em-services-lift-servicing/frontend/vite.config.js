import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        // Splits heavy, rarely-changing vendor code out of the main app chunk (was one
        // ~1.7MB bundle) so a typical page load doesn't pull in MUI/DataGrid/PDF/chart
        // code it isn't using yet, and vendor code caches independently of app changes.
        manualChunks: {
          // react/react-dom stay bundled with mui rather than their own chunk - MUI
          // imports React internally, and splitting them apart caused a circular chunk.
          mui: ['@mui/material', '@mui/icons-material', '@mui/x-data-grid', 'react', 'react-dom'],
          vendor: ['react-router-dom', 'axios', 'dayjs', 'formik', 'yup'],
          pdfCharts: ['jspdf', 'chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});
