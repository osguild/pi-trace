/**
 * Load source lines for the source pane (cached by absolute path).
 */

import { readFileSync } from "node:fs";

const cache = new Map<string, string[]>();

export function loadSourceLines(path: string): string[] {
	const hit = cache.get(path);
	if (hit) return hit;
	const text = readFileSync(path, "utf8");
	const lines = text.split(/\r?\n/);
	cache.set(path, lines);
	return lines;
}

export function clearSourceCache(): void {
	cache.clear();
}
