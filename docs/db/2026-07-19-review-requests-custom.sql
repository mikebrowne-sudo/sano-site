-- Custom (job-less) review requests (2026-07-19)
-- Lets staff send a review request to any person (past client, someone met in
-- person) with a manually entered name + phone/email. client_id/job_id are
-- already nullable; these columns record who a custom request went to.

alter table public.review_requests
  add column if not exists recipient_name text,
  add column if not exists recipient_contact text;
