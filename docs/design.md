# pi-trace design

**Status:** Locked 2026-07-22. Standalone pi package — not bundled in learn-pi.

## Goal

An execution explorer inside pi: pick code you do not understand, run it under controlled tracing, and scrub forward/backward through what actually happened — locals, call stack, current line — without leaving pi's TUI.

For **intuition while learning**, not production debugging.

## Non-goals (v1)

- Breakpoints, conditional stops, edit-and-continue
- Rust / C / native lldb/gdb integration
- Agent-driven stepping (human drives the TUI)
- Dependency on learn-pi or track records

## Core mechanism: trace replay

Run the target once (or up to a step cap), capture a **trace tape** of events, step in the TUI by moving an index on that tape.

Why replay over live pdb:

- **Back-step** is pedagogically valuable
- No terminal suspend / input fights inside `ctx.ui.custom()`
- Simpler subprocess model (JSONL from Python wrapper)

## Architecture

```
/trace [file] [entry?]
       │
       ▼
lib/trace/runner.ts           ← language dispatch
       │
       └── python → lib/trace/python-tracer.ts
                      └── lib/trace/scripts/trace_py.py

Trace JSON → lib/trace/session.ts   ← cursor, stack, locals diff
       │
       ▼
lib/trace/tui/app.ts          ← pi Component
```

### Trace event shape

```ts
type TraceEvent =
  | { kind: "line"; file: string; line: number; fn: string; locals: Record<string, string> }
  | { kind: "call"; file: string; line: number; fn: string; args: Record<string, string> }
  | { kind: "return"; file: string; line: number; fn: string; value: string }
  | { kind: "exception"; file: string; line: number; msg: string };
```

Python wrapper uses `sys.settrace`, safe reprs, JSONL on stdout. Caps: **5000 steps**, **64KB per local**, subprocess timeout.

## TUI layout

```
┌ trace ─ echo.py ─ step 12/847 ─────────────────────────────────────┐
│ SOURCE                          │ LOCALS                           │
│  3 │ def echo(line):            │  line = "hello"                  │
│> 4 │     return line            │                                  │
│                                 │ STACK                            │
│                                 │  echo()  echo.py:4               │
├─────────────────────────────────┴──────────────────────────────────┤
│ ←/→ step · n next · p prev · s into · o out · c end · r re-run · q quit│
└──────────────────────────────────────────────────────────────────────┘
```

Implementation follows pi's `Component` + `ctx.ui.custom()` pattern (same model as learn-pi's `/learn-tui`, but no shared code).

## Command resolution

| Args | Behavior |
|---|---|
| `/trace` | `main.py` in `process.cwd()`, else file picker |
| `/trace path/to/file.py` | Trace file (module top-level or `main`) |
| `/trace file.py fn_name` | Call `fn_name()` after import |

Paths resolve relative to pi's current working directory, not `~/.pi/learn/`.

## Language roadmap

| Version | Languages |
|---|---|
| v0.1 | Python only |
| v0.2 | JavaScript (Node) |
| v0.3+ | Evaluate Rust via external tool + summary only |

## Phases

1. **Trace engine** — `trace_py.py`, `python-tracer.ts`, `session.ts`, smoke script ✅
2. **TUI** — `tui/app.ts`, `tui/render.ts`, `/trace` command ✅
3. **Polish** — entry picker, goto line, export snippet to clipboard
4. **JS tracer** — second language

## Risks

| Risk | Mitigation |
|---|---|
| Infinite loop | Step cap + timeout; "trace truncated" in status |
| Huge locals | Truncate repr |
| Side effects | Document: runs real code in subprocess |
| Wrong language | Clear error: "v0.1 supports .py only" |

## Package layout

```
pi-trace/
  extensions/
    index.ts
    trace.ts          # /trace command
  lib/trace/
    types.ts
    session.ts
    runner.ts
    python-tracer.ts
    scripts/trace_py.py
    tui/
      app.ts
      render.ts
  docs/design.md
  scripts/smoke.ts
```
