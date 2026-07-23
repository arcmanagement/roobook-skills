# Claude Code format

Claude Code loads the open-standard `SKILL.md` from `.claude/skills` and exposes it as `/read-roobook`. Invoke explicitly with:

```text
/read-roobook Search my local library for discussion of interest rates and cite the pages.
```

Install only for Claude Code:

```sh
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a claude-code -y
```

Claude Code provides `${CLAUDE_SKILL_DIR}` for bundled resources. Execute the wrapper with:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/roobook.mjs" doctor
```

The skill remains model-invocable so Claude may also select it automatically from its description. No duplicate command file is required because Claude Code exposes skills as slash commands.

