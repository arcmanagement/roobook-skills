# Commands

All examples use `roobook`. If PATH setup is not active, substitute `node <skill-dir>/scripts/roobook.mjs`.

```sh
roobook import <book.pdf>
roobook queue [--job <queue-job-id>] [--follow]
roobook library [--local-only]
roobook outline --book <id|title>
roobook markdown --book <id|title> [--pages 1-30 | --chapters 1-3 | --from-section <id|title> --to-section <id|title>] [--no-figures]
roobook sections --book <id|title> --query <text> [--markdown]
roobook search --query <text> [--book <id|title>] [--pages 1-30] [--kind all|text|figure] [--limit 20]
roobook figures search --book <id|title> [--query <text>] [--pages 1-30]
roobook context --book <id|title> --query <text> [--pages 1-30] [--kind all|text|figure] [--around 1] [--limit 8]
roobook deliver --book <id|title> --artifact docling|markdown|source|manifest [--pages 1-30] [--output <path>]
roobook deliver --book <id|title> --artifact figure --figure <figure-id> --output <path>
roobook logs [--level debug|info|warning|error] [--subsystem <name>] [--book <id>] [--job <id>] [--since 15m] [--limit 200] [--follow]
roobook paths
roobook doctor
roobook install-shell-command
```

Page sets accept ranges and comma-separated pages, for example `1-30`, `2,8,11-15`. Log `--level` is a minimum severity. Supported duration units are `s`, `m`, `h`, and `d`.

Search, library, queue, and paths output are JSON. Markdown contains stable RooBook page links. `queue --follow` and `logs --follow` emit NDJSON. Delivery writes artifact bytes to stdout unless the wrapper consumes them with `--output`.
