---
name: read-roobook
description: Import, search, read, quote, summarize, and deliver books through RooBook's local DoclingDocument cache. Use when Codex or Claude Code needs to import a PDF, inspect a RooBook library, read page or chapter ranges as Markdown, retrieve keyword-matching sections or figures, deliver artifacts, open cited pages, inspect processing logs, or set up the App Store app's `roobook` shell command.
---

# Read RooBook

Use the signed RooBook Mac app as the data plane. Keep single-book reading and search on the Mac; do not upload PDFs or DoclingDocument content to another service.

## Bootstrap

Resolve this skill's directory from the loaded `SKILL.md`. Use its `scripts/roobook.mjs` wrapper.

- In Codex, follow [references/codex.md](references/codex.md) and invoke the skill as `$read-roobook`.
- In Claude Code, follow [references/claude-code.md](references/claude-code.md), where `${CLAUDE_SKILL_DIR}` resolves the installed skill directory, and invoke it as `/read-roobook`.

1. If `command -v roobook` succeeds, run `roobook help` and require `RooBook AI CLI` in the output.
2. Otherwise run `node <skill-dir>/scripts/roobook.mjs install-shell-command`.
3. If the command is installed but the current shell has not reloaded PATH, continue with `node <skill-dir>/scripts/roobook.mjs`; do not block the task.
4. If RooBook.app is missing, ask the user to install the Mac app.
5. If RooBook.app exists but agent mode is unavailable, tell the user to update RooBook in the Mac App Store. Never inject a binary into the app bundle or alter its code signature.
6. Run `roobook doctor` or the wrapper equivalent before the first data request.

The bootstrap writes a user-owned wrapper at `~/.local/share/roobook-cli` and shim at `~/.local/bin/roobook`. Do not use `sudo`, write `/usr/local/bin`, or edit shell startup files unless the user explicitly asks for a permanent PATH change.

## Import workflow

When the user explicitly asks to import a local PDF, run `roobook import <path>`. The wrapper copies the PDF into RooBook's private shared staging store, submits a small request to the app's shared inbox, and reuses the existing RooBook process without opening another window. The signed app alone owns the persistent queue and performs Docling/OCR/enrichment locally. Do not send the PDF or derived page images to Cloud Run. Use the returned job ID with `roobook queue --job <id> --follow`; use `logs --subsystem ingest --job <id>` for diagnosis.

Treat GUI and CLI as two views over the same sources. Do not create a CLI-only database or search index. `library` uses API/PostgreSQL metadata plus the same local availability cache; `search`, `markdown`, `outline`, and `sections` use the same cached canonical DoclingDocument; `figures` and delivery use the same metadata and image cache; `queue` and `logs` read the native app's persistent stores. Use `roobook paths` when storage identity needs verification.

## Read workflow

1. Run `roobook library --local-only` to ground book IDs and cache availability.
2. Resolve ambiguous titles by presenting the matching title and ID; do not guess.
3. Start with `roobook search --query <query> --book <id> --limit 10`.
4. Use `roobook context --book <id> --query <query> --around 1` for answer context. Use `outline` before chapter/section requests, then `markdown --chapters`, `markdown --from-section/--to-section`, or `sections --query --markdown` as appropriate.
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
