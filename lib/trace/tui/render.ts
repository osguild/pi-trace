/**
 * Line renderers for trace TUI.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TraceEvent } from "../types.ts";
import { basename, padLine, truncatePlain } from "../format.ts";
import { loadSourceLines } from "../source.ts";
import type { StackFrame, TraceSession } from "../session.ts";

export type TraceScreen = "trace" | "help";

export function renderStatusBar(
	theme: Theme,
	session: TraceSession,
	width: number,
	rerunning: boolean,
): string {
	const ev = session.current;
	const file = ev?.file ?? session.entry.file;
	const name = basename(file);
	const step = session.length === 0 ? "0/0" : `${session.cursor + 1}/${session.length}`;
	const parts = [theme.fg("accent", theme.bold("pi-trace")), name, theme.fg("dim", `step ${step}`)];

	if (session.entry.function) {
		parts.push(theme.fg("dim", `entry ${session.entry.function}()`));
	}
	if (ev) {
		parts.push(theme.fg("dim", `${ev.fn}:${ev.line}`));
	}
	if (session.truncated) {
		parts.push(theme.fg("warning", "truncated"));
	}
	if (rerunning) {
		parts.push(theme.fg("dim", "re-running…"));
	}

	return padLine(parts.join(theme.fg("dim", " · ")), width);
}

export function renderSourcePane(
	theme: Theme,
	session: TraceSession,
	width: number,
	maxLines: number,
): string[] {
	const lines: string[] = [""];
	lines.push(theme.fg("dim", theme.bold("SOURCE")));

	const ev = session.current;
	if (!ev || session.length === 0) {
		lines.push(theme.fg("dim", "  (no trace events — did the script run?)"));
		return lines;
	}

	if (ev.kind === "exception") {
		lines.push(theme.fg("warning", `  exception at ${basename(ev.file)}:${ev.line}`));
		lines.push(theme.fg("warning", `  ${truncatePlain(ev.msg, width - 4)}`));
		return lines;
	}

	let source: string[];
	try {
		source = loadSourceLines(ev.file);
	} catch {
		lines.push(theme.fg("dim", `  (cannot read ${ev.file})`));
		return lines;
	}

	const currentLine = ev.line;
	const start = Math.max(1, currentLine - Math.floor(maxLines / 2));
	const end = Math.min(source.length, start + maxLines - 1);
	const gutter = String(end).length;

	for (let n = start; n <= end; n++) {
		const text = source[n - 1] ?? "";
		const marker = n === currentLine ? theme.fg("accent", ">") : " ";
		const num = theme.fg("dim", String(n).padStart(gutter, " "));
		const body =
			n === currentLine
				? theme.fg("accent", truncatePlain(text, width - gutter - 6))
				: truncatePlain(text, width - gutter - 6);
		lines.push(` ${marker}${num} ${body}`);
	}

	return lines;
}

export function renderLocalsPane(theme: Theme, session: TraceSession, width: number): string[] {
	const lines: string[] = [""];
	lines.push(theme.fg("dim", theme.bold("LOCALS")));

	const ev = session.current;
	if (!ev) {
		lines.push(theme.fg("dim", "  (none)"));
		return lines;
	}

	if (ev.kind === "return") {
		lines.push(`  return ${truncatePlain(ev.value, width - 10)}`);
		return lines;
	}

	if (ev.kind === "exception") {
		lines.push(theme.fg("warning", `  ${truncatePlain(ev.msg, width - 4)}`));
		return lines;
	}

	const locals = session.localsAtCursor();
	const keys = Object.keys(locals).sort();
	if (keys.length === 0) {
		lines.push(theme.fg("dim", "  (empty)"));
		return lines;
	}

	for (const key of keys) {
		lines.push(`  ${theme.fg("success", key)} = ${truncatePlain(locals[key]!, width - key.length - 6)}`);
	}
	return lines;
}

export function renderStackPane(theme: Theme, stack: StackFrame[], width: number): string[] {
	const lines: string[] = [""];
	lines.push(theme.fg("dim", theme.bold("STACK")));

	if (stack.length === 0) {
		lines.push(theme.fg("dim", "  (empty)"));
		return lines;
	}

	for (const frame of stack) {
		const label = `${frame.fn}()  ${basename(frame.file)}:${frame.line}`;
		lines.push(`  ${truncatePlain(label, width - 2)}`);
	}
	return lines;
}

export function renderEventKind(theme: Theme, ev: TraceEvent | null): string {
	if (!ev) return "";
	if (ev.kind === "call") return theme.fg("dim", "event: call");
	if (ev.kind === "line") return theme.fg("dim", "event: line");
	if (ev.kind === "return") return theme.fg("dim", "event: return");
	return theme.fg("warning", "event: exception");
}

export function renderHelpBody(theme: Theme, width: number): string[] {
	const inner = Math.max(20, width - 2);
	const rows = [
		"← / h     previous step",
		"→ / l / n next step",
		"s         step into (next call)",
		"o         step out (return from frame)",
		"c         continue to end",
		"0         jump to start",
		"r         re-run trace",
		"?         this help",
		"esc / q   quit",
	];
	const lines: string[] = [""];
	for (const row of rows) {
		lines.push(`  ${truncatePlain(row, inner)}`);
	}
	if (width > 10) {
		lines.push("");
		lines.push(theme.fg("dim", "  Trace replay — runs real Python in a subprocess."));
	}
	return lines;
}

export function renderFooter(theme: Theme, screen: TraceScreen, width: number): string[] {
	const hints: Record<TraceScreen, string> = {
		trace: "←/→ step · n/p next/prev · s into · o out · c end · 0 start · r re-run · ? help · q quit",
		help: "esc back · q quit",
	};
	return [
		theme.fg("border", "─".repeat(Math.max(0, width))),
		padLine(theme.fg("dim", hints[screen]), width),
	];
}

export function renderTruncationNote(theme: Theme, session: TraceSession, width: number): string | null {
	if (!session.truncated) return null;
	const reason = session.truncationReason ?? "trace truncated";
	return padLine(theme.fg("warning", reason), width);
}
