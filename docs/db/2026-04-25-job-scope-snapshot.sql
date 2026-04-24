-- Phase C — Job creation from accepted quote.
--
-- Adds a jsonb column to `jobs` that holds a point-in-time snapshot
-- of the quote's scope at the moment the job was created. The
-- snapshot is append-only: future edits to the source quote must
-- not change what the job was agreed to deliver, so we copy rather
-- than reference.
--
-- Shape of the snapshot (stored as jsonb):
--   {
--     "source_quote_id": "uuid",
--     "service_category": "residential" | "commercial",
--     "frequency": "weekly" | ...,
--     "estimated_hours": number | null,
--     "allowed_hours": number | null,
--     "scope_size": string | null,
--     "generated_scope": string | null,
--     "residential_items": [ { "label": string, "price": number } ],
--     "commercial_scope": [
--       { "area_type": string, "task_name": string,
--         "frequency_label": string, "task_group": string | null }
--     ],
--     "created_at": "2026-04-25T..."
--   }
--
-- Nullable because existing rows pre-dating this migration have no
-- snapshot. The create-from-quote server action always populates
-- it on new inserts; ad-hoc jobs created via the existing NewJobForm
-- leave it null.
--
-- Safe to re-run: add-column uses IF NOT EXISTS.

alter table public.jobs
  add column if not exists scope_snapshot jsonb;

comment on column public.jobs.scope_snapshot is
  'Point-in-time copy of the accepted quote''s scope at job-creation time. Append-only; never updated after insert. See src/app/portal/quotes/[id]/_actions-job.ts.';

-- Optional: a partial GIN index for querying the snapshot. Not
-- critical for Phase C because the UI just reads the whole blob on
-- the job page. Add later if we start filtering jobs by snapshot
-- fields.
-- create index if not exists jobs_scope_snapshot_gin
--   on public.jobs using gin (scope_snapshot)
--   where scope_snapshot is not null;
