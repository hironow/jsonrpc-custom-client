/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		// Re-enable type-checking errors during builds
		ignoreBuildErrors: false,
	},
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
