/**
 * pi-trace — entry point.
 *
 * Interactive execution explorer for pi. Loaded via package.json:
 *   "pi": { "extensions": ["./extensions/index.ts"] }
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import trace from "./trace";

export default function piTrace(pi: ExtensionAPI) {
	trace(pi);
}
