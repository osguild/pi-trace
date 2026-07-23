/**
 * Trace tape types — shared between tracer, session, and TUI.
 */

export type TraceEvent =
	| {
			kind: "line";
			file: string;
			line: number;
			fn: string;
			locals: Record<string, string>;
	  }
	| {
			kind: "call";
			file: string;
			line: number;
			fn: string;
			args: Record<string, string>;
	  }
	| {
			kind: "return";
			file: string;
			line: number;
			fn: string;
			value: string;
	  }
	| {
			kind: "exception";
			file: string;
			line: number;
			msg: string;
	  };

export interface TraceResult {
	events: TraceEvent[];
	truncated: boolean;
	truncationReason?: string;
	entry: { file: string; function?: string };
}

export const DEFAULT_MAX_STEPS = 5000;
export const DEFAULT_LOCAL_MAX_BYTES = 64 * 1024;
