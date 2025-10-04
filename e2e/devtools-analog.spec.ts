import { test, expect } from "@playwright/test";

test("DevTools-like interactions on a data URL", async ({ page }) => {
	const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Devtools Test</title></head><body>
  <h1>Devtools Test Page</h1>
  <label>Name: <input id='nameInput' type='text'></label>
  <button id='greetBtn' onclick="document.getElementById('output').textContent='Hello, ' + document.getElementById('nameInput').value + '!'">Greet</button>
  <div id='output'></div>
  <button id='alertBtn' onclick="alert('Alert OK')">Alert</button>
  <label>File: <input id='fileInput' type='file' onchange="document.getElementById('fileName').textContent=this.files[0]?.name||''"></label>
  <div id='fileName'></div>
  </body></html>`;

	const url = "data:text/html;charset=utf-8," + encodeURIComponent(html);
	await page.goto(url);

	// Type and click
	await page.fill("#nameInput", "Nino");
	await page.click("#greetBtn");
	await expect(page.locator("#output")).toHaveText("Hello, Nino!");

	// Dialog handling
	page.once("dialog", async (d) => {
		await d.accept();
	});
	await page.click("#alertBtn");

	// File upload
	await page.setInputFiles("#fileInput", "README.md");
	await expect(page.locator("#fileName")).toContainText("README.md");

	// Title evaluation
	await expect(page).toHaveTitle("Devtools Test");
});
