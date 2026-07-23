# Troubleshooting

## `roobook` is not found

Run:

```sh
node <skill-dir>/scripts/roobook.mjs install-shell-command
```

Continue through the wrapper in the current task even if `~/.local/bin` is not yet in PATH. Do not stop only to edit shell configuration.

## RooBook is installed but agent mode is missing

The installed App Store version predates the CLI. Ask the user to update RooBook through the Mac App Store, then rerun setup. Do not copy a development executable into `/Applications/RooBook.app`; that invalidates the signed product.

## No local books appear

Run `roobook library` to distinguish cloud-only from cached books. Ask the user to download/open the target book in RooBook. Do not silently switch a single-book local request to BigQuery or upload the source elsewhere.

## A command fails

Run `roobook doctor`, then `roobook logs --since 15m --level warning`. Narrow by book ID or job ID. Report the exact event and next action without exposing binary content or credentials.

## Delivery fails outside the sandbox

Use the wrapper's `--output <path>`. Do not pass an arbitrary output path into the signed app executable; RooBook deliberately writes artifact bytes to stdout.

