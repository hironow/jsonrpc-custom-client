import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure JSDOM is reset between tests to avoid cross-test DOM collisions
afterEach(() => {
	cleanup();
});
