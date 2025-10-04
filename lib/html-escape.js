// Minimal HTML escaping for safe innerHTML rendering of JSON blocks.
// Escapes only characters that can break out of text context: & < >
// Do NOT escape quotes here since we don't interpolate into attributes.

function escapeHtml(str) {
	if (typeof str !== "string") return String(str);
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = { escapeHtml };
