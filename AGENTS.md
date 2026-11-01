# AGENTS.md

Saber is the MLS Constructora frontend: an Angular 22 application with Angular Material, organized as DDD bounded contexts that consume the `akame` backend REST API. The interface follows the Material Design 3 Expressive direction on top of Material 3. MLS Constructora currently has two apps, Human Resources and Administration, and Saber implements the frontend of both, together with the catalogs and the certificates that support them.

## Required skills

Before every code change, load and follow [angular-ddd](.agents/skills/angular-ddd/SKILL.md).

Before every project change, load and follow [git-workflow](.agents/skills/git-workflow/SKILL.md) to verify the current branch and use the appropriate task branch. Follow its references for commits and pushes; never merge branches or create/manage PRs.

## Commands

Use **Bun** for every development task. Install the dependencies with `bun install`, run the scripts with `bun run <script>` and the one-off binaries with `bunx <command>`. Do not use `npm`, `yarn` or `pnpm`.

```sh
bun install                        # dependencies
bun run test                       # unit tests (Vitest)
bun run build                      # production compilation
bun run start                      # development server
bun run watch                      # development compilation in watch mode
```

Run the checks relevant to the change. Report only commands actually executed, their results and any blockers.

## Permanent rules

- **Git:** Work only on task branches; never edit, commit, push, merge, rebase, reset, or otherwise modify `main` or `develop`. The agent may create commits and push task branches when the user explicitly requests it. Never merge branches or create/manage pull requests; the user handles PRs and merges. Never change the Git username or email configuration.
- **Existing work:** preserve unrelated working-tree changes.
- **Secrets:** never expose `.env`, credentials or tokens.
- **Documentation:** the user maintains it. Do not create or update documentation unless explicitly requested.
- **Language:** write code, comments and repository instructions in English. The copy of the interface is written in Spanish.
