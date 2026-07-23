/**
 * Smoke check — run Python tracer against a fixture.
 *
 * Usage: pnpm smoke
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTrace } from "../lib/trace/runner.ts";
import { TraceSession } from "../lib/trace/session.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(ROOT, "scripts", "fixtures", "echo.py");

async function main(): Promise<void> {
	const result = await runTrace({
		file: FIXTURE,
		cwd: ROOT,
	});

	if (result.events.length === 0) {
		throw new Error("expected trace events");
	}

	const session = new TraceSession(result);
	const kinds = new Set(result.events.map((e) => e.kind));
	console.log("events:", result.events.length, "kinds:", [...kinds].join(", "));
	console.log("truncated:", result.truncated);

	while (session.stepNext()) {
		/* walk to end */
	}
	const echoReturn = result.events.find(
		(ev) => ev.kind === "return" && ev.fn === "echo" && ev.value.includes("hi"),
	);
	if (!echoReturn) {
		throw new Error("expected echo() to return a value containing 'hi'");
	}

	console.log("stack depth at end:", session.stackAtCursor().length);
	console.log("smoke ok");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
