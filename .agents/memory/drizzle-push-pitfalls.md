---
name: drizzle-push pitfalls (Repliyo)
description: Why `npm run db:push` must never be blindly accepted on this project, and how to sync schema safely.
---

# drizzle-kit push pitfalls on Repliyo

`npm run db:push` (drizzle-kit push) on this project surfaces **destructive** changes that must NOT be accepted:

- It wants to **drop the `session` table** — this is the express-session / connect-pg-simple store. It is NOT modeled in `shared/schema.ts`, so drizzle thinks it's stray. Dropping it breaks all logins.
- It wants to **drop legacy columns** that still hold data: `messages.seq`, and `conversations.conversation_summary` / `summary_last_message_id` / `summary_updated_at` (summaries moved to the `conversation_user_summaries` table). The new code ignores these columns; keeping them is harmless.

**Rule:** never accept the "Do you still want to push changes?" data-loss prompt. The app runs fine with these extra objects present.

**How to apply additive schema changes safely:** add the missing UNIQUE constraints directly via SQL after checking for duplicates (filter rows where any constrained column IS NULL, since Postgres treats NULLs as distinct). drizzle's inline `.unique()` / `unique().on(...)` auto-generate names like `<table>_<cols>_unique`; match those names exactly.

**TUI note:** drizzle-kit push requires a TTY — piping stdin (`yes "" | ...`) fails with exit -1. `python`/`python3`/`expect` are NOT on PATH here; `script` (util-linux) is. But prefer direct SQL for additive constraints rather than fighting the prompt.

**Why:** keeps login working and avoids 3,397+ rows of data loss while still aligning data-integrity constraints with the schema.
