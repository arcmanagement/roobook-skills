# RooBook Skills

Public AI-agent skills for reading books cached by the RooBook Mac app.

## Install

Install `read-roobook` for Codex and Claude Code with [`skills`](https://www.npmjs.com/package/skills):

```sh
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a codex -a claude-code -y
```

Agent-specific installs and invocation formats are also provided:

```sh
# Codex: invoke as $read-roobook
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a codex -y

# Claude Code: invoke as /read-roobook
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a claude-code -y
```

The shared `SKILL.md` follows the Agent Skills open standard. Codex additionally reads `agents/openai.yaml`; Claude Code uses its native `.claude/skills` location and `${CLAUDE_SKILL_DIR}` resource substitution. Keeping one canonical skill avoids duplicated instructions drifting while still supplying each product's native metadata and invocation format.

The skill locates the Mac App Store app, verifies its built-in AI CLI, and can create a user-owned `~/.local/bin/roobook` shim. It does not modify the signed app bundle or upload local book content.
