/**
 * Trace session — cursor over a recorded tape (forward/back step, stack view).
 */

import type { TraceEvent, TraceResult } from "./types.ts";

export interface StackFrame {
	fn: string;
	file: string;
	line: number;
}

export class TraceSession {
	readonly events: TraceEvent[];
	readonly truncated: boolean;
	readonly truncationReason?: string;
	readonly entry: TraceResult["entry"];
	private index = 0;

	constructor(result: TraceResult) {
		this.events = result.events;
		this.truncated = result.truncated;
		this.truncationReason = result.truncationReason;
		this.entry = result.entry;
	}

	get cursor(): number {
		return this.index;
	}

	get length(): number {
		return this.events.length;
	}

	get current(): TraceEvent | null {
		return this.events[this.index] ?? null;
	}

	stepNext(): boolean {
		if (this.index >= this.events.length - 1) return false;
		this.index++;
		return true;
	}

	stepPrev(): boolean {
		if (this.index <= 0) return false;
		this.index--;
		return true;
	}

	jumpToEnd(): void {
		this.index = Math.max(0, this.events.length - 1);
	}

	jumpToStart(): void {
		this.index = 0;
	}

	/** Reconstruct call stack at the current cursor (deepest frame last). */
	stackAtCursor(): StackFrame[] {
		const stack: StackFrame[] = [];
		for (let i = 0; i <= this.index && i < this.events.length; i++) {
			const ev = this.events[i]!;
			if (ev.kind === "call") {
				stack.push({ fn: ev.fn, file: ev.file, line: ev.line });
			} else if (ev.kind === "return") {
				stack.pop();
			} else if (ev.kind === "line" && stack.length === 0) {
				stack.push({ fn: ev.fn, file: ev.file, line: ev.line });
			} else if (ev.kind === "line" && stack.length > 0) {
				stack[stack.length - 1] = { fn: ev.fn, file: ev.file, line: ev.line };
			}
		}
		return stack;
	}

	localsAtCursor(): Record<string, string> {
		const ev = this.current;
		if (!ev) return {};
		if (ev.kind === "line" || ev.kind === "call") return ev.locals ?? ev.args ?? {};
		return {};
	}
}
