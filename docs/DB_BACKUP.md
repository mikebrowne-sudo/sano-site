# Database backup + restore test

Independent weekly backup of the Supabase database, stored off Supabase, with an
automatic restore test every run. Workflow: [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml).

## What it does

- **When:** every Sunday ~4am NZ, plus on demand (GitHub → Actions → *Weekly database backup + restore test* → Run workflow).
- **What:** the `public` and `auth` schemas (all business data + staff/contractor logins), taken as one consistent snapshot.
- **Where:** encrypted (GPG AES-256) and stored as a GitHub Actions artifact for 90 days (~13 weekly copies).
- **Test:** each run decrypts the backup, restores it into a throwaway Postgres 17, and checks every table's row count matches the live database. The run summary is the test record. A failed run emails the repo admins.

**Not covered:** Supabase Storage files (job photos, worker documents, receipts). Supabase's own daily backups don't cover them either.

## Secrets (GitHub repo → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connect → **Session pooler** URI (port 5432), with the DB password filled in. Not the direct host (IPv6-only, unreachable from GitHub). |
| `BACKUP_PASSPHRASE` | A long random passphrase. **Also store it in the password manager**: without it no backup can be decrypted. |

If the DB password changes, update `SUPABASE_DB_URL`.

## Restoring from a backup

1. Download the artifact `sano-db-YYYY-MM-DD` from the run in GitHub Actions and unzip it.
2. Decrypt: `gpg -d -o sano.dump sano-db-YYYY-MM-DD.dump.gpg` (enter the passphrase).
3. Restore into the target database (a new Supabase project, or the existing one after confirming what will be overwritten):
   `pg_restore --dbname="<target URI>" --no-owner --no-privileges --clean --if-exists sano.dump`
   Use Postgres 17 client tools. For a whole-project loss, a new Supabase project already has the roles and extensions the dump expects.
4. Check `source-counts.txt` (in the same artifact) against the restored row counts.
5. Re-enter anything created since the backup, using emails, Stripe and bank records (Business Continuity Plan, data-loss scenario).
