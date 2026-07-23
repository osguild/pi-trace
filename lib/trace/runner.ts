/**
 * Language dispatch for trace capture.
 */

import { access } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { tracePython } from "./python-tracer.ts";
import type { TraceResult } from "./types.ts";

export interface TraceRequest {
	file: string;
	entry?: string;
	cwd: string;
}

export async function runTrace(req: TraceRequest): Promise<TraceResult> {
	if (!req.file.toLowerCase().endsWith(".py")) {
		throw new Error("v0.1 supports .py files only");
	}

	const absFile = isAbsolute(req.file) ? req.file : resolve(req.cwd, req.file);
	await access(absFile);

	return tracePython({
		file: absFile,
		cwd: req.cwd,
		entry: req.entry,
	});
}
