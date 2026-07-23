/**
 * Language dispatch for trace capture.
 */

import type { TraceResult } from "./types";

export interface TraceRequest {
	file: string;
	entry?: string;
	cwd: string;
}

export async function runTrace(_req: TraceRequest): Promise<TraceResult> {
	throw new Error("runTrace not implemented — see docs/design.md Phase 1");
}
