/** Text helpers for trace TUI (dependency-light). */

export function truncatePlain(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, Math.max(0, max - 1)) + "…";
}

export function basename(path: string): string {
	const parts = path.split(/[/\\]/);
	return parts[parts.length - 1] ?? path;
}

export function padLine(line: string, width: number): string {
	const plain = line.replace(/\u001b\[[0-9;]*m/g, "");
	if (plain.length >= width) return line;
	return line + " ".repeat(width - plain.length);
}
