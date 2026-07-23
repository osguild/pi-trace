/**
 * Spawn trace_py.py and parse JSONL into a TraceResult.
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_LOCAL_MAX_BYTES,
	DEFAULT_MAX_STEPS,
	type TraceEvent,
	type TraceResult,
} from "./types.ts";

const TRACE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "scripts", "trace_py.py");

export interface PythonTraceRequest {
	file: string;
	cwd: string;
	entry?: string;
	maxSteps?: number;
	localMaxBytes?: number;
	timeoutMs?: number;
}

function isTraceEvent(value: unknown): value is TraceEvent {
	if (typeof value !== "object" || value === null) return false;
	const kind = (value as { kind?: string }).kind;
	return kind === "line" || kind === "call" || kind === "return" || kind === "exception";
}

function parseMeta(value: unknown): { truncated: boolean; reason?: string } | null {
	if (typeof value !== "object" || value === null) return null;
	const obj = value as { kind?: string; truncated?: boolean; reason?: string | null };
	if (obj.kind !== "meta") return null;
	return {
		truncated: Boolean(obj.truncated),
		reason: obj.reason ?? undefined,
	};
}

export function tracePython(req: PythonTraceRequest): Promise<TraceResult> {
	const maxSteps = req.maxSteps ?? DEFAULT_MAX_STEPS;
	const localMaxBytes = req.localMaxBytes ?? DEFAULT_LOCAL_MAX_BYTES;
	const timeoutMs = req.timeoutMs ?? 30_000;

	return new Promise((resolve, reject) => {
		const args = [
			TRACE_SCRIPT,
			"--file",
			req.file,
			"--cwd",
			req.cwd,
			"--max-steps",
			String(maxSteps),
			"--local-max-bytes",
			String(localMaxBytes),
		];
		if (req.entry) {
			args.push("--entry", req.entry);
		}

		const child = spawn("python3", args, {
			cwd: req.cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const events: TraceEvent[] = [];
		let metaTruncated = false;
		let metaReason: string | undefined;
		let stderr = "";

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`trace timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		child.stderr?.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf8");
		});

		const rl = createInterface({ input: child.stdout! });
		rl.on("line", (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(trimmed);
			} catch {
				stderr += `\ninvalid json: ${trimmed}\n`;
				return;
			}

			const meta = parseMeta(parsed);
			if (meta) {
				metaTruncated = meta.truncated;
				metaReason = meta.reason;
				return;
			}

			if (isTraceEvent(parsed)) {
				events.push(parsed);
			}
		});

		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});

		child.on("close", (code) => {
			clearTimeout(timer);
			if (code !== 0 && events.length === 0) {
				const detail = stderr.trim() || `python exited with code ${code}`;
				reject(new Error(detail));
				return;
			}

			resolve({
				events,
				truncated: metaTruncated,
				truncationReason: metaReason,
				entry: { file: req.file, function: req.entry },
			});
		});
	});
}
