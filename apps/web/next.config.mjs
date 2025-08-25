import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	output: process.env.IS_DOCKER ? 'standalone' : undefined,
	transpilePackages: ['@repo/ui'],
	outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
