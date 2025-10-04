// Assumes input is already HTML-escaped (e.g., via escapeHtml)
export function highlightEscapedJson(escapedJson: string): string {
	return escapedJson
		.replace(
			/\"([^\"]+)\":/g,
			'<span class="text-blue-400 font-medium">"$1"</span>:',
		)
		.replace(/: \"([^\"]*)\"/g, ': <span class="text-green-400">"$1"</span>')
		.replace(/: (\d+\.?\d*)/g, ': <span class="text-orange-400">$1</span>')
		.replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
		.replace(/: null/g, ': <span class="text-gray-500">null</span>');
}
