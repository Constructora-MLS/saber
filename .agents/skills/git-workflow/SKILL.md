---
name: git-workflow
description: "Manage Git work in this repository: inspect the current branch, create the correct feature, release, or hotfix branch without working directly on main or develop, and prepare commit messages. Use before project changes, branch operations, or commit-message requests."
---

# Git workflow

Use this skill before changing project files, creating or switching branches, or preparing a commit message. Follow the repository's `AGENTS.md` instructions as well as these rules.

## Non-negotiable repository rules

- Never work directly on `main` or `develop`; treat both as protected base branches. Do not edit, commit, push, merge, rebase, reset, or otherwise move either branch.
- Start ordinary work on a feature branch based on `develop`. Use a hotfix branch based on `main` only for an explicitly urgent production fix. Use a release branch based on `develop` only for an explicitly requested release.
- Preserve existing staged, unstaged, and untracked work. Never stash, discard, overwrite, or include unrelated changes without the user's direction.
- Create commits or push task branches only when the user explicitly requests it. Never merge branches or create/manage pull requests; the user handles PRs and merges.
- Never change Git username/email configuration, force-push, or expose credentials from remote URLs or repository files.

## Required workflow

1. Read the applicable `AGENTS.md` instructions.
2. Inspect `git status --short --branch` and `git branch --show-current` before editing. Determine whether the current branch is `main`, `develop`, or an existing work branch. Check available local and remote-tracking base refs without printing remote URLs.
3. Follow the branch decision rules in [references/branching.md](references/branching.md). If the intended work type or base is unclear, a required base is unavailable, or existing changes might be unrelated, stop and ask before switching or creating a branch.
4. Create/switch to a correctly based work branch before making project changes. Create it directly from the base ref; do not check out or modify `main` or `develop` to do so.
5. Before a requested commit or push, verify the current branch is a task branch, inspect the relevant diff, and follow [references/commit-messages.md](references/commit-messages.md). Stage only the intended files. Never commit or push `main` or `develop`.
6. At completion, report the work branch, tests/verification actually run, and any remaining changes. Never merge branches or create/manage PRs; the user handles those.
