-- Add profile_snapshot column to intake_sessions
ALTER TABLE public.intake_sessions 
ADD COLUMN IF NOT EXISTS profile_snapshot JSONB;

-- Add index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_intake_sessions_profile 
ON public.intake_sessions USING GIN (profile_snapshot);

-- Comment for clarity
COMMENT ON COLUMN public.intake_sessions.profile_snapshot IS 
'AI-generated profile from quiz completion, stored for user reference';

