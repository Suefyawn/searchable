import nextConfig from "eslint-config-next";

const config = [...nextConfig, { ignores: [".next/**", ".vinext/**", "dist/**", ".wrangler/**", "node_modules/**", ".data/**", "drizzle/**"] }];

export default config;
