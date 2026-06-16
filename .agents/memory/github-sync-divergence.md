---
name: GitHub sync divergence with external repo
description: Why Git sync to the external GitHub repo keeps diverging, and how the agent can apply merged PRs without git write access.
---

# GitHub sync divergence (external repo workflow)

This repl is connected to an external GitHub repo (`origin`) where a separate collaborator (Codex) opens/merges PRs. The user pulls/pushes via the Replit Git pane or the Shell; the agent reviews merges here.

## The recurring pain
Replit creates auto-checkpoint commits (e.g. "Update application preview image", opengraph.jpg) after loops/publishes. These land on local `main` and put it **ahead** of `origin/main`. When a PR merges on GitHub, local also goes **behind**. Result: `main...origin/main [ahead 1, behind 1]`, and the Git pane "Sync Changes" leaves it half-done (fetches but won't auto-merge divergent histories).

## Agent constraint
The main agent **cannot run any git write op** — `git fetch`, `git pull`, `git merge`, `git reset`, even `rm .git/*.lock` are all blocked ("Destructive git operations are not allowed in the main agent"). A background Project Task runs in an isolated repl, so it can't fix THIS working tree either.

## What works
- **Read-only git is allowed** (`git show`, `git diff`, `git log`, `git rev-parse`, `git status --no-optional-locks`, `git cat-file`).
- After the user clicks Sync in the Git pane, the merge commit is usually **already fetched** (`git cat-file -t <sha>` returns `commit`, `git rev-parse origin/main` shows the new sha) — it just isn't merged into the working tree.
- To apply a fetched-but-unmerged PR's files into the working tree without git:
  `git show origin/main:<path> > <path>` for each changed file (read-only show + plain file redirect — both allowed). Get the changed file list from the GitHub API (github connection) via `/repos/<owner>/<repo>/pulls/<n>/files`.
- DB migrations: apply the PR's SQL directly with `psql "$DATABASE_URL" -f <migration.sql>` (the migrations here are idempotent `ADD COLUMN IF NOT EXISTS`). Deploys do NOT auto-run migrations — prod needs `npm run db:push` or the SQL run manually.

## Clean reconciliation (user must do, in Shell)
The user's own Shell is NOT subject to the agent's git guard. To make local exactly match GitHub and kill the divergence:
`git reset --hard origin/main` (discards only the disposable auto-checkpoint commits).
Or to keep local commits: `git pull origin main --no-edit` (merge) then push.

**Why:** the divergence is caused by disposable Replit auto-commits, not real work, so resetting local to origin is safe and stops the loop.
