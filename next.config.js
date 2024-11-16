module.exports = {
  reactStrictMode: true,
  // Add this to suppress Radix UI warnings
  webpack: (config) => {
    config.optimization.minimizer = [];
    return config;
  },
} 