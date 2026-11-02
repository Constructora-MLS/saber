# Commit message policy

The agent may stage and commit reviewed changes on a task branch, or push that task branch, only when the user explicitly requests those actions. Never commit or push `main` or `develop`. Never merge branches or create/manage PRs; the user handles PRs and merges. Never change Git username or email configuration.

## Review before drafting

1. Check `git status --short --branch` and confirm the current branch is a task branch, not `main` or `develop`.
2. Review staged changes with `git diff --cached` and relevant unstaged changes with `git diff`.
3. Confirm the message describes only the intended changes. If unrelated changes are mixed together, identify them and ask which files belong in the commit.
4. When a commit is explicitly requested, stage only the reviewed paths (`git add -- <paths>`), never use a blanket add for unrelated work, then review `git diff --cached` and run `git diff --cached --check`.
5. Never put secrets, credentials, access tokens, or private data in the message.

## Format

Follow an established repository convention if one is visible in recent history. Otherwise use:

```text
type: imperative, concise summary
```

Use a scope only if the repository already uses scopes:

```text
type(scope): imperative, concise summary
```

Keep the subject specific and brief. Add a body only when necessary to explain motivation or consequences. Do not claim behavior that the diff does not implement.

## Types

| Type | Choose when |
|---|---|
| `feat` | Adding a capability |
| `fix` | Correcting a defect |
| `docs` | Changing documentation only |
| `style` | Formatting-only changes with no logic change |
| `refactor` | Restructuring code without intended behavior change |
| `test` | Changing tests without changing production behavior |
| `chore` | Maintenance not better described by another type |
| `build` | Changing build configuration or dependencies |
| `ci` | Changing CI configuration or workflows |
| `perf` | Primarily improving performance |
| `revert` | Intentionally reversing a prior change; identify what is reverted |

Choose the type from the primary intent, not from the branch name or perceived importance. Use `style` only when behavior is unchanged and `refactor` only when no behavior change is intended.

## Commit and push workflow

- Commit only after the user explicitly requests it, the intended paths are staged, the staged diff is reviewed, and relevant checks have been run. Use the drafted message and do not amend or rewrite published history unless specifically authorized.
- Push only after the user explicitly requests it and only from the current task branch. Use its configured upstream when clear; if the remote or destination is ambiguous, ask. Never force-push or expose remote URLs that may contain credentials.
- Never merge branches or create/manage pull requests. The user handles PRs and merges.
- If asked only to draft a message, return it in a code block and do not stage, commit, or push. If the diff is unavailable or ambiguous, ask instead of inventing a message.
