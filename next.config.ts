// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* other config options here */
  
  // Add this block to ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Your existing reactStrictMode (move it inside the main config object)
  reactStrictMode: true, 
};

// Remove the separate module.exports if you are using ES Modules syntax
// module.exports = {
//  reactStrictMode: true,
// };

export default nextConfig;