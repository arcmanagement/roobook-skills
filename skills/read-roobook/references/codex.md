# Codex format

Codex loads the open-standard `SKILL.md` and the Codex-specific `agents/openai.yaml` sidecar. Invoke explicitly with:

```text
$read-roobook Search my local library for discussion of interest rates and cite the pages.
```

Install only for Codex:

```sh
npx skills add arcmanagement/roobook-skills --skill read-roobook -g -a codex -y
```

Codex does not define `${CLAUDE_SKILL_DIR}`. Resolve the directory of the loaded `SKILL.md`, then execute:

```sh
node <resolved-skill-directory>/scripts/roobook.mjs doctor
```

Do not assume the current repository is the skill directory.

