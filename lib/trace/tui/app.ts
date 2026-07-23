/**
 * Trace replay TUI — step forward/backward through a recorded execution tape.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { matchesKey } from "@earendil-works/pi-tui";
import { clearSourceCache } from "../source.ts";
import { padLine } from "../format.ts";
import { TraceSession } from "../session.ts";
import type { TraceRequest } from "../runner.ts";
import { runTrace } from "../runner.ts";
import {
	renderEventKind,
	renderFooter,
	renderHelpBody,
	renderLocalsPane,
	renderSourcePane,
	renderStackPane,
	renderStatusBar,
	renderTruncationNote,
	type TraceScreen,
} from "./render.ts";

interface TuiHandle {
	requestRender: () => void;
}

export class TraceTuiApp implements Component {
	private screen: TraceScreen = "trace";
	private session: TraceSession;
	private rerunning = false;
	private errorMessage: string | null = null;

	constructor(
		private readonly tui: TuiHandle,
		private readonly theme: Theme,
		private readonly done: (value: undefined) => void,
		session: TraceSession,
		private readonly request: TraceRequest,
	) {
		this.session = session;
	}

	invalidate(): void {}

	handleInput(data: string): void {
		if (matchesKey(data, "q") || matchesKey(data, "ctrl+c")) {
			this.done(undefined);
			return;
		}

		if (this.screen === "help") {
			if (matchesKey(data, "escape") || data === "?") {
				this.screen = "trace";
				this.tui.requestRender();
			}
			return;
		}

		if (data === "?" || matchesKey(data, "shift+/")) {
			this.screen = "help";
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "escape")) {
			this.done(undefined);
			return;
		}

		if (matchesKey(data, "shift+r") || matchesKey(data, "r")) {
			void this.rerun();
			return;
		}

		let changed = false;

		if (
			matchesKey(data, "right") ||
			matchesKey(data, "n") ||
			matchesKey(data, "l") ||
			data === " "
		) {
			changed = this.session.stepNext();
		} else if (matchesKey(data, "left") || matchesKey(data, "p") || matchesKey(data, "h")) {
			changed = this.session.stepPrev();
		} else if (matchesKey(data, "s")) {
			changed = this.session.stepInto();
		} else if (matchesKey(data, "o")) {
			changed = this.session.stepOut();
		} else if (matchesKey(data, "c")) {
			this.session.jumpToEnd();
			changed = true;
		} else if (data === "0") {
			this.session.jumpToStart();
			changed = true;
		}

		if (changed) this.tui.requestRender();
	}

	render(width: number): string[] {
		const lines: string[] = [];

		lines.push(renderStatusBar(this.theme, this.session, width, this.rerunning));

		const trunc = renderTruncationNote(this.theme, this.session, width);
		if (trunc) lines.push(trunc);

		if (this.errorMessage) {
			lines.push(padLine(this.theme.fg("warning", this.errorMessage), width));
		}

		if (this.screen === "help") {
			lines.push(...renderHelpBody(this.theme, width));
			lines.push(...renderFooter(this.theme, "help", width));
			return lines;
		}

		if (this.session.length === 0) {
			lines.push("");
			lines.push(this.theme.fg("dim", "  No events recorded."));
			lines.push(...renderFooter(this.theme, "trace", width));
			return lines;
		}

		const sourceMax = Math.min(16, Math.max(8, Math.floor(width > 100 ? 14 : 10)));
		lines.push(...renderSourcePane(this.theme, this.session, width, sourceMax));

		const ev = this.session.current;
		if (ev) {
			lines.push(renderEventKind(this.theme, ev));
		}

		lines.push(...renderLocalsPane(this.theme, this.session, width));
		lines.push(...renderStackPane(this.theme, this.session.stackAtCursor(), width));
		lines.push(...renderFooter(this.theme, "trace", width));

		return lines;
	}

	private async rerun(): Promise<void> {
		if (this.rerunning) return;
		this.rerunning = true;
		this.errorMessage = null;
		this.tui.requestRender();
		try {
			clearSourceCache();
			const result = await runTrace(this.request);
			this.session = new TraceSession(result);
			this.screen = "trace";
		} catch (err) {
			this.errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			this.rerunning = false;
			this.tui.requestRender();
		}
	}
}
