/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		// Re-enable ESLint during builds to catch issues
		ignoreDuringBuilds: false,
	},
	typescript: {
		// Re-enable type-checking errors during builds
		ignoreBuildErrors: false,
	},
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
