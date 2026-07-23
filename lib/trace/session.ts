/**
 * Trace session — cursor over a recorded tape (forward/back step, stack view).
 *
 * Implemented in Phase 1 of docs/design.md.
 */

import type { TraceEvent, TraceResult } from "./types";

export class TraceSession {
	readonly events: TraceEvent[];
	readonly truncated: boolean;
	private index = 0;

	constructor(result: TraceResult) {
		this.events = result.events;
		this.truncated = result.truncated;
	}

	get cursor(): number {
		return this.index;
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
}
