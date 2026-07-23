# RooBook Skills

Public AI-agent skills for reading books cached by the RooBook Mac app.

## Install

Install `read-roobook` for Codex and Claude Code with [`skills`](https://www.npmjs.com/package/skills):

```sh
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a codex -a claude-code -y
```

The skill locates the Mac App Store app, verifies its built-in AI CLI, and can create a user-owned `~/.local/bin/roobook` shim. It does not modify the signed app bundle or upload local book content.

