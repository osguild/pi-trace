/**
 * /trace — open the execution explorer TUI.
 *
 * Usage:
 *   /trace [file.py] [entry_function]
 *
 * v0.1: Python only. Trace engine + TUI not wired yet — shows a stub notice.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

export default function trace(pi: ExtensionAPI) {
	pi.registerCommand("trace", {
		description: "Interactive execution explorer — step through Python code (trace replay TUI)",
		handler: async (args, ctx) => {
			await runTrace(args, ctx);
		},
	});
}

async function runTrace(args: string, ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") {
		ctx.ui.notify("pi-trace requires interactive pi (not rpc/json mode).", "error");
		return;
	}

	const tokens = args.trim().split(/\s+/).filter(Boolean);
	const fileArg = tokens[0];
	const entryArg = tokens[1];

	const hint = fileArg
		? entryArg
			? `Would trace ${fileArg} → ${entryArg}()`
			: `Would trace ${fileArg}`
		: "Would trace main.py in cwd";

	ctx.ui.notify(
		`pi-trace scaffold — not implemented yet. ${hint}. See docs/design.md in the repo.`,
		"info",
	);
}
