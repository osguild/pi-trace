#!/usr/bin/env python3
"""Record execution trace as JSONL for pi-trace.

Invoked by lib/trace/python-tracer.ts (Phase 1). Not wired yet.
"""
from __future__ import annotations

import json
import sys


def main() -> int:
    sys.stderr.write("trace_py.py scaffold — not implemented\n")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
