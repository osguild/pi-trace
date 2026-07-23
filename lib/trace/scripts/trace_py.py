#!/usr/bin/env python3
"""Record Python execution as JSONL for pi-trace.

Each stdout line is one JSON object (trace event or final meta).
Diagnostics go to stderr.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import runpy
import sys
import sysconfig
import traceback
from typing import Any


def safe_repr(value: Any, max_bytes: int) -> str:
    try:
        text = repr(value)
    except Exception as exc:  # noqa: BLE001
        text = f"<repr failed: {exc}>"
    encoded = text.encode("utf-8", errors="replace")
    if len(encoded) <= max_bytes:
        return text
    trimmed = encoded[: max_bytes - 1].decode("utf-8", errors="replace")
    return trimmed + "…"


def locals_dict(frame: Any, max_bytes: int) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in frame.f_locals.items():
        if key.startswith("__") and key.endswith("__"):
            continue
        out[key] = safe_repr(value, max_bytes)
    return out


def is_user_code(path: str, tracer_path: str, cwd: str) -> bool:
    if not path or path.startswith("<"):
        return False
    real = os.path.realpath(path)
    if real == os.path.realpath(tracer_path):
        return False
    cwd_real = os.path.realpath(cwd)
    if not real.startswith(cwd_real):
        return False
    if "site-packages" in real:
        return False
    for key in ("stdlib", "platstdlib"):
        std_root = sysconfig.get_path(key)
        if std_root and real.startswith(os.path.realpath(std_root)):
            return False
    return True


class StepTracer:
    def __init__(
        self,
        max_steps: int,
        max_local_bytes: int,
        tracer_path: str,
        cwd: str,
    ) -> None:
        self.max_steps = max_steps
        self.max_local_bytes = max_local_bytes
        self.tracer_path = tracer_path
        self.cwd = cwd
        self.steps = 0
        self.truncated = False
        self.truncation_reason: str | None = None
        self.stopped = False

    def emit(self, payload: dict[str, Any]) -> None:
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def trace(self, frame: Any, event: str, arg: Any) -> Any:
        if self.stopped:
            return None

        filename = frame.f_code.co_filename
        if not is_user_code(filename, self.tracer_path, self.cwd):
            return self.trace

        self.steps += 1
        if self.steps > self.max_steps:
            self.truncated = True
            self.truncation_reason = "max steps exceeded"
            self.stopped = True
            return None

        path = os.path.realpath(filename)
        line = frame.f_lineno
        fn = frame.f_code.co_name

        if event == "line":
            self.emit(
                {
                    "kind": "line",
                    "file": path,
                    "line": line,
                    "fn": fn,
                    "locals": locals_dict(frame, self.max_local_bytes),
                }
            )
        elif event == "call":
            self.emit(
                {
                    "kind": "call",
                    "file": path,
                    "line": line,
                    "fn": fn,
                    "args": locals_dict(frame, self.max_local_bytes),
                }
            )
        elif event == "return":
            self.emit(
                {
                    "kind": "return",
                    "file": path,
                    "line": line,
                    "fn": fn,
                    "value": safe_repr(arg, self.max_local_bytes),
                }
            )
        elif event == "exception":
            msg = str(arg[1]) if arg and len(arg) > 1 else "exception"
            self.emit({"kind": "exception", "file": path, "line": line, "msg": msg})

        return self.trace


def run_target(target: str, entry: str | None, cwd: str, tracer: StepTracer) -> None:
    os.chdir(cwd)
    target_path = os.path.realpath(target)
    if not os.path.isfile(target_path):
        raise FileNotFoundError(target_path)

    sys.settrace(tracer.trace)
    try:
        if entry:
            module_name = "pi_trace_target"
            spec = importlib.util.spec_from_file_location(module_name, target_path)
            if spec is None or spec.loader is None:
                raise ImportError(f"cannot load {target_path}")
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            func = getattr(module, entry, None)
            if func is None or not callable(func):
                raise AttributeError(f"{entry} is not callable on {target_path}")
            func()
        else:
            runpy.run_path(target_path, run_name="__main__")
    finally:
        sys.settrace(None)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="pi-trace Python recorder")
    parser.add_argument("--file", required=True, help="Python file to trace")
    parser.add_argument("--cwd", required=True, help="Working directory")
    parser.add_argument("--entry", help="Function to call after import")
    parser.add_argument("--max-steps", type=int, default=5000)
    parser.add_argument("--local-max-bytes", type=int, default=65536)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    tracer = StepTracer(args.max_steps, args.local_max_bytes, __file__, args.cwd)
    exit_code = 0

    try:
        run_target(args.file, args.entry, args.cwd, tracer)
    except SystemExit as exc:
        code = exc.code
        exit_code = int(code) if isinstance(code, int) else 0
    except Exception:
        traceback.print_exc(file=sys.stderr)
        exit_code = 1

    tracer.emit(
        {
            "kind": "meta",
            "truncated": tracer.truncated,
            "reason": tracer.truncation_reason,
            "exitCode": exit_code,
        }
    )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
