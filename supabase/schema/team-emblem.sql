-- Personalization uses the families table's existing owner-only write policy.
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS team_emblem text NOT NULL DEFAULT ''
 CHECK (octet_length(team_emblem) <= 90000);
