import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
	...coreWebVitals,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"no-console": "warn",
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/rules-of-hooks": "warn",
			"react-hooks/purity": "warn",
		},
	},
];

export default eslintConfig;
