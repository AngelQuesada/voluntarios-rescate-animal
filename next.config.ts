import { NextConfig } from 'next';
import withPWA from 'next-pwa';
import path from 'path';

// Configurar PWA solo en producción para evitar conflictos con Turbopack
const isPWAEnabled =
  process.env.NODE_ENV === 'production' &&
  process.env.DISABLE_PWA !== 'true' &&
  process.env.IS_TESTING_ENVIRONMENT !== 'true';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignorar errores de tipado durante la compilación
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuración de source maps para debugging
  productionBrowserSourceMaps: true,
  // Habilitar source maps en desarrollo
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Configuración de source maps compatible con Next.js
      // Next.js maneja automáticamente los source maps en desarrollo

      // Optimizaciones para debugging del cliente
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          minimize: false,
        };

        // Mejorar la resolución de source maps para debugging
        config.resolve = {
          ...config.resolve,
          alias: {
            ...config.resolve.alias,
            '@': path.resolve(__dirname, 'src'),
          },
        };
      }
    }
    return config;
  },
  // Configuración de Turbopack (ahora estable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Configuración específica para testing
  ...(process.env.IS_TESTING_ENVIRONMENT === 'true' && {
    // Configuración más rápida para tests
    compiler: {
      removeConsole: false,
    },
  }),
};

// Solo aplicar PWA en producción
if (isPWAEnabled) {
  const pwaConfig = withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: false,
  });

  module.exports = pwaConfig(nextConfig as any);
} else {
  module.exports = nextConfig;
}
