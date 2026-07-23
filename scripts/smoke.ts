/**
 * Smoke check — imports resolve; tracer throws until Phase 1 lands.
 *
 * Usage: pnpm smoke
 */

import { TraceSession } from "../lib/trace/session.ts";
import type { TraceResult } from "../lib/trace/types.ts";
import { runTrace } from "../lib/trace/runner.ts";

const empty: TraceResult = {
	events: [],
	truncated: false,
	entry: { file: "main.py" },
};

async function main(): Promise<void> {
	const session = new TraceSession(empty);
	console.log("TraceSession cursor:", session.cursor);

	try {
		await runTrace({ file: "main.py", cwd: process.cwd() });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.log("runTrace (expected):", msg);
	}

	console.log("smoke ok");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
