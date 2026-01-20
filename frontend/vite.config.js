import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Permite acceso desde cualquier IP de la red local
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext', // Optimiza para navegadores modernos
    minify: 'terser', // Minificación máxima
    cssMinify: true,
    reportCompressedSize: false, // Acelera el build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'recharts'],
          'vendor-utils': ['react-qr-code'],
        },
      },
    },
  },
});
