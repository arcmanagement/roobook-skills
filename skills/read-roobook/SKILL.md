---
name: read-roobook
description: Search, read, quote, summarize, and deliver books from the RooBook Mac app through its local DoclingDocument cache. Use when a user asks Codex or Claude Code to inspect their RooBook library, read a page range as Markdown, search book text or figures, retrieve a figure/PDF/Docling artifact, open a cited page, inspect import or figure-processing logs, or set up the App Store app's `roobook` shell command.
---

# Read RooBook

Use the signed RooBook Mac app as the data plane. Keep single-book reading and search on the Mac; do not upload PDFs or DoclingDocument content to another service.

## Bootstrap

Resolve this skill's directory from the loaded `SKILL.md`. Use its `scripts/roobook.mjs` wrapper.

1. If `command -v roobook` succeeds, run `roobook help` and require `RooBook AI CLI` in the output.
2. Otherwise run `node <skill-dir>/scripts/roobook.mjs install-shell-command`.
3. If the command is installed but the current shell has not reloaded PATH, continue with `node <skill-dir>/scripts/roobook.mjs`; do not block the task.
4. If RooBook.app is missing, ask the user to install the Mac app.
5. If RooBook.app exists but agent mode is unavailable, tell the user to update RooBook in the Mac App Store. Never inject a binary into the app bundle or alter its code signature.
6. Run `roobook doctor` or the wrapper equivalent before the first data request.

The bootstrap writes only a user-owned shim at `~/.local/bin/roobook`. Do not use `sudo`, write `/usr/local/bin`, or edit shell startup files unless the user explicitly asks for a permanent PATH change.

## Read workflow

1. Run `roobook library --local-only` to ground book IDs and cache availability.
2. Resolve ambiguous titles by presenting the matching title and ID; do not guess.
3. Start with `roobook search --query <query> --book <id> --limit 10`.
4. Use `roobook context --book <id> --query <query> --around 1` for answer context, or `roobook markdown --book <id> --pages <range>` for a requested page range.
5. Cite claims with the returned `roobook://book/{bookId}/page/{page}` links. Preserve printed wording when quoting and keep quotes short.
6. If no `--book` is specified, search only the local library. Use cloud-wide search only when the user explicitly requests cross-book or large-library retrieval.

## Figures and delivery

Use `roobook figures search` for charts, tables, captions, and AI descriptions. Use the returned figure ID with `deliver --artifact figure` only when image bytes are needed.

Use `--output <path>` for PDF, image, or Docling delivery. The wrapper performs file writing outside the App Sandbox while RooBook emits bytes to stdout. Do not print binary output into the conversation or terminal.

## Logs and diagnosis

For import, reprocessing, or figure-generation failures, first run:

```sh
roobook logs --since 15m --level warning --limit 200
```

Narrow with `--book`, `--job`, or `--subsystem ingest|figures|cli`; use `--follow` only while actively monitoring. Logs contain operational metadata, not book text or credentials.

Read [references/commands.md](references/commands.md) for all command shapes and [references/troubleshooting.md](references/troubleshooting.md) when bootstrap or cache access fails.

