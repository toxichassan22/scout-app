# Backend SQLite Operations

The deployed SQLite database predates Prisma Migrate history. Creating and applying a guessed baseline directly to that live database is unsafe: Prisma could attempt to recreate tables or mark a schema version that does not exactly describe the deployed file. The operational policy is therefore **inspect, back up, diff, review, then migrate**. No script here deletes, resets, or overwrites the active database.

## Paths and environment

- `SQLITE_DATABASE_PATH`: absolute or server-relative path to the active SQLite file. Default: `server/prisma/dev.db`.
- `SQLITE_BACKUP_DIR`: directory for timestamped backups. Default: repository-level `scout-backups/` (gitignored). In production, set this to persistent storage outside the deployment checkout and include it in off-host retention.
- Prisma's current schema still has a fixed SQLite URL. Operational scripts intentionally use `SQLITE_DATABASE_PATH` through a Prisma datasource override so checks target the explicit deployed file.

The process account needs read/write access to the database directory (SQLite WAL/SHM files) and backup directory. Restrict backup directory access because backups contain credentials and festival data.

## Routine commands

Run from `server/`:

```sh
npm run db:ready
npm run db:drift
npm run db:backup
```

`db:ready` fails unless:

- the database is a non-empty file;
- `PRAGMA integrity_check` returns `ok`;
- WAL journal mode is active;
- foreign key enforcement can be enabled and `foreign_key_check` has no violations;
- all Prisma application tables are present;
- the backup directory exists and is readable/writable.

`db:backup` performs an integrity check, a passive WAL checkpoint, and SQLite `VACUUM INTO` to a new timestamped file. It checks the backup and, by default, copies it to a temporary restore candidate and verifies that candidate. It never accepts an output filename and never overwrites the active DB. Use `npm run db:backup -- --no-verify-restore` only when temporary disk constraints prevent restore verification.

## Restore runbook (manual and non-destructive by default)

1. Stop PM2/application writers.
2. Keep the active database untouched. Copy the selected backup to a **new temporary filename** in the database filesystem.
3. Point `SQLITE_DATABASE_PATH` at that temporary candidate and run `npm run db:ready`.
4. Confirm expected row counts and critical records with read-only queries/application checks.
5. Take one final timestamped backup of the old active database.
6. Only during an approved maintenance window, atomically rename files to promote the verified candidate; preserve the old DB under a timestamped name. Remove stale `-wal`/`-shm` files only while all writers are stopped and only for the promoted filename.
7. Start the app and run `npm run test:health`.

There is intentionally no automated `db:restore` command: an unattended restore could overwrite current data.

## Schema drift and migration strategy

`npm run db:drift` compares the active SQLite schema to `prisma/schema.prisma` using `prisma migrate diff --exit-code`. It writes diff output only to a temporary directory and exits nonzero on drift. It applies nothing.

For each future schema change:

1. Run `npm run db:ready`, `npm run db:drift`, and `npm run db:backup` against production before maintenance.
2. Create/review migration SQL against a disposable copy, never the only live DB.
3. Test migration plus application checks against a restored backup copy.
4. Prefer additive SQLite changes. Explicitly review any table rebuild, dropped column/index, required column, or uniqueness change for data loss and locking.
5. Introduce Prisma migration history only after producing a reviewed baseline SQL from the exact deployed schema. Store it under `prisma/migrations/<timestamp>_baseline/migration.sql`; on each existing database use `prisma migrate resolve --applied <timestamp>_baseline` **only after** drift is zero and a verified backup exists. New empty installations may then use `prisma migrate deploy`.
6. Never use `prisma migrate reset` or `prisma db push --accept-data-loss` in production.

Until that exact-schema baseline is reviewed on the server, drift checking is the safe strategy; this change deliberately does not fabricate or mark a migration as applied.
