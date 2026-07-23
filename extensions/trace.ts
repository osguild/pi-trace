/**
 * /trace — open the execution explorer TUI.
 *
 * Usage:
 *   /trace [file.py] [entry_function]
 *
 * Paths resolve against pi's current working directory.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { resolveTraceTarget } from "../lib/trace/resolve.ts";
import { runTrace } from "../lib/trace/runner.ts";
import { TraceSession } from "../lib/trace/session.ts";
import { TraceTuiApp } from "../lib/trace/tui/app.ts";

export default function trace(pi: ExtensionAPI) {
	void pi;
	pi.registerCommand("trace", {
		description: "Interactive execution explorer — step through Python code (trace replay TUI)",
		handler: async (args, ctx) => {
			await runTraceCommand(args, ctx);
		},
	});
}

async function runTraceCommand(args: string, ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") {
		ctx.ui.notify("pi-trace requires interactive pi (not rpc/json mode).", "error");
		return;
	}

	const cwd = process.cwd();

	let target;
	try {
		target = await resolveTraceTarget(args, cwd);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		ctx.ui.notify(msg, "error");
		return;
	}

	let session: TraceSession;
	try {
		const result = await runTrace({
			file: target.file,
			entry: target.entry,
			cwd: target.cwd,
		});
		session = new TraceSession(result);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		ctx.ui.notify(`trace failed: ${msg}`, "error");
		return;
	}

	if (session.length === 0) {
		ctx.ui.notify("trace recorded zero events — is the file under cwd and executed?", "warning");
	}

	const request = {
		file: target.file,
		entry: target.entry,
		cwd: target.cwd,
	};

	await ctx.ui.custom((tui, theme, _keybindings, done) => {
		return new TraceTuiApp(tui, theme, done, session, request);
	});
}
