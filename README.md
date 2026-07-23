# pi-trace

Interactive **execution explorer** for [pi](https://pi.dev). Trace Python code and step forward and backward through source, call stack, and locals in a full-screen TUI — built for understanding code by watching what it actually does.

Independent of [learn-pi](https://github.com/osguild/learn-pi). Install either package alone or both.

## Status

**Alpha — trace engine + TUI (Phases 1–2) shipped.** Run `/trace [file.py] [entry_fn]` in interactive pi to step through a recorded Python execution. See [`docs/design.md`](docs/design.md).

## Install (once published)

```bash
pi install npm:@osguild/pi-trace
```

Local development:

```bash
git clone git@github.com:osguild/pi-trace.git
pi -e ~/gitrepos/pi-trace
```

## Command

```
/trace [file.py] [entry_function]
```

With no arguments, traces `main.py` in pi's current working directory.

**Keys:** `←/→` or `h/l` step back/forward · `n`/`p` next/prev · `s` step into · `o` step out · `c` jump to end · `0` start · `r` re-run · `?` help · `q` quit

## Requirements

- [pi](https://pi.dev) in interactive TUI mode
- Python 3 on `PATH` (v1 is Python-only)

## Relationship to learn-pi

learn-pi owns the learning loop (tracks, exercises, reflection). pi-trace owns **execution introspection**. No runtime dependency between them.

Optional workflow when both are installed:

```bash
cd ~/gitrepos/my-exercise
/trace src/echo.py echo
```

## License

MIT
