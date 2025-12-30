import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remover console.logs em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  images: {
    // Formatos modernos de imagem
    formats: ["image/avif", "image/webp"],
    // Tamanhos de dispositivo otimizados
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "lnkzgwjecsgtcrzmduuy.supabase.co",
      },
    ],
  },
};

export default nextConfig;
