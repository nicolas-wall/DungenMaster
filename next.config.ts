import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  webpack: (config) => {
    // src/ usa imports relativos con extensión .js apuntando a archivos .ts
    // (requerido para que Node/tsx los ejecute directo en scripts y tests).
    // El bundler de Next no resuelve esa extensión por defecto.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
