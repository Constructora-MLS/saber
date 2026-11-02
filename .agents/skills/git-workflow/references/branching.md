# Branching policy

## Branch roles

| Branch | Purpose | Base | Intended integration |
|---|---|---|---|
| `main` | Stable production history | Existing project history | Receives approved releases and production hotfixes; do not modify directly |
| `develop` | Integration base for upcoming work | Existing project history | Receives approved features and release/hotfix synchronization; do not modify directly |
| `feature/<slug>` | Normal feature, bug fix, test, or maintenance task | `develop` | `develop` |
| `release/<version>` | Stabilize an explicitly requested release | `develop` | `main`, then synchronize release changes to `develop` |
| `hotfix/<slug>` | Explicitly urgent production correction | `main` | `main` and `develop` |

Use a short lowercase slug describing the task. Do not invent a release version or create a `develop` branch when it is absent.

## Decide from the current branch

- **On `develop` with ordinary work:** create and switch directly to `feature/<slug>` from `develop`.
- **On `main` with ordinary work:** create and switch directly to `feature/<slug>` from `develop`, not from `main`.
- **On `main` with an explicitly urgent production fix:** create and switch to `hotfix/<slug>` from `main`.
- **On `develop` with an explicitly requested release:** create and switch to `release/<version>` from `develop`.
- **Already on a suitable work branch:** stay on it and verify it matches the task. Do not create another branch unnecessarily.
- **On a mismatched work branch, an unknown branch, or in a repository without the expected GitFlow refs:** do not guess, rebase, or move branches. Explain what is present and ask which base/workflow to use.

Examples below create a new branch from a base ref without checking out or advancing the protected base branch:

```sh
git switch -c feature/<slug> develop
git switch -c release/<version> develop
git switch -c hotfix/<slug> main
```

If only a remote-tracking base ref exists, use that exact ref as the start point and avoid configuring the new feature branch to track the protected base. Do not assume the remote is named `origin`. Do not fetch without permission when the needed ref is unavailable.

## Preserve work

- Inspect staged, unstaged, and untracked changes before changing branches.
- If the working tree is dirty and it is unclear whether the changes belong to the requested task, ask before switching.
- If the user confirms the changes are the task's work, create the correctly based work branch without discarding them. If Git reports a conflict or refuses the switch, stop and explain; never force it.
- Do not use `git stash`, `git reset`, `git clean`, cherry-pick, rebase, or merge as an automatic recovery strategy.

## Integration and cleanup

Describe the expected integration target, but never merge branches or create/manage PRs; the user handles PRs and merges. The agent may push a task branch only when explicitly requested. Never push `main` or `develop`, force-push, or delete branches unless the user explicitly requests branch cleanup.
