import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/html-escape.js";
import { highlightEscapedJson } from "@/lib/json-highlight";

describe("highlightEscapedJson", () => {
	it("wraps keys, strings, numbers, booleans, null with spans", () => {
		const obj = { key: "value", n: 42, f: false, t: true, z: null };
		const json = JSON.stringify(obj, null, 2);
		const safe = escapeHtml(json);
		const out = highlightEscapedJson(safe);
		expect(out).toContain(
			'<span class="text-blue-400 font-medium">"key"</span>:',
		);
		expect(out).toContain(': <span class="text-green-400">"value"</span>');
		expect(out).toContain(': <span class="text-orange-400">42</span>');
		expect(out).toContain(': <span class="text-purple-400">false</span>');
		expect(out).toContain(': <span class="text-purple-400">true</span>');
		expect(out).toContain(': <span class="text-gray-500">null</span>');
	});
});
