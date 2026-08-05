# Reminder dispatch safety

## Practical outcome

Scheduled reminders are claimed in the database before Repliyo contacts Metricool. If two app processes run the same cycle, only one can claim a given reminder. A process that disappears after claiming a reminder does not cause an automatic retry with an unknown delivery outcome.

This reduces duplicate-message risk. It does not claim mathematical exactly-once delivery because Metricool does not accept an idempotency key: a provider timeout can still leave the remote outcome unknown.

## Runtime model

- `scheduled` means the reminder is available to claim.
- `processing` means one worker owns the delivery attempt.
- `sent`, `failed`, and `cancelled` remain terminal event states.
- Claims older than 15 minutes become `failed` with an explicit ambiguous-outcome reason. They are not returned to `scheduled`.
- A normal non-success result becomes `failed` immediately if the event is still `processing`; an existing terminal state such as `cancelled` is never overwritten.
- The conversation is unlocked after abandoned-claim recovery so later follow-up policy can proceed normally.

The claim uses one database transaction with `FOR UPDATE SKIP LOCKED`, followed by the `scheduled` to `processing` update before the provider boundary.

## Worker controls

Existing single-process deployments keep their current behavior by default.

- `BACKGROUND_WORKERS_ENABLED=0` disables both sync and lifecycle workers on a web-only replica.
- `SYNC_WORKER_ENABLED` overrides the global value for the sync worker.
- `LIFECYCLE_WORKER_ENABLED` overrides the global value for lifecycle and reminder work.
- Accepted values are `1/0`, `true/false`, `yes/no`, and `on/off`. Invalid values stop startup instead of silently selecting an unsafe role.

When the app is split into web and worker deployments, enable each background job on one intended worker and disable it on web-only replicas.

## Deployment order

Migration `0009_reminder_claims` is backward-compatible with the previous application version: it only adds a nullable timestamp and an additive partial unique index.

For Replit, use this order:

1. Stop the application workflow.
2. Pull the merged GitHub `main`.
3. Run `npx drizzle-kit migrate` with the existing Replit database environment.
4. Restart the workflow.
5. Confirm startup logs and run one no-send reminder status check before any manual reminder action.

Do not start the new server code before the migration is applied because reminder queries select `processing_started_at`.

## Verification boundary

Automated tests use in-memory reminders and a fake delivery probe. They never load a production account, contact Metricool, or send a real message. The browser E2E runs the two-worker race on desktop and mobile and fails on unexpected browser errors.
