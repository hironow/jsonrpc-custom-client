const path = require("node:path");

/** @type {import('vitest').UserConfig} */
module.exports = {
	test: {
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		environment: "jsdom",
		setupFiles: ["tests/setup.ts"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
	},
};
