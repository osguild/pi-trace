/**
 * Resolve /trace command arguments to a trace target.
 */

import { access } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

export interface ResolvedTraceTarget {
	file: string;
	entry?: string;
	cwd: string;
}

export async function resolveTraceTarget(args: string, cwd: string): Promise<ResolvedTraceTarget> {
	const tokens = args.trim().split(/\s+/).filter(Boolean);
	const cwdResolved = resolve(cwd);

	if (tokens[0]) {
		const file = isAbsolute(tokens[0]) ? tokens[0] : resolve(cwdResolved, tokens[0]);
		await access(file);
		return { file, entry: tokens[1], cwd: cwdResolved };
	}

	const main = join(cwdResolved, "main.py");
	try {
		await access(main);
		return { file: main, cwd: cwdResolved };
	} catch {
		throw new Error("usage: /trace [file.py] [entry_fn] — no file given and main.py not found in cwd");
	}
}
