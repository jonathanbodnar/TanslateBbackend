-- Migration: Add 9 additional communication sliders
-- Date: 2025-10-21
-- Purpose: Extend contact_sliders table from 6 to 15 sliders for Phase 2

-- Add 9 new slider columns to contact_sliders table
ALTER TABLE contact_sliders
  ADD COLUMN IF NOT EXISTS listening_style INTEGER CHECK (listening_style >= 0 AND listening_style <= 100),
  ADD COLUMN IF NOT EXISTS response_timing INTEGER CHECK (response_timing >= 0 AND response_timing <= 100),
  ADD COLUMN IF NOT EXISTS emotional_expression INTEGER CHECK (emotional_expression >= 0 AND emotional_expression <= 100),
  ADD COLUMN IF NOT EXISTS problem_depth INTEGER CHECK (problem_depth >= 0 AND problem_depth <= 100),
  ADD COLUMN IF NOT EXISTS accountability INTEGER CHECK (accountability >= 0 AND accountability <= 100),
  ADD COLUMN IF NOT EXISTS reassurance_level INTEGER CHECK (reassurance_level >= 0 AND reassurance_level <= 100),
  ADD COLUMN IF NOT EXISTS conversation_initiation INTEGER CHECK (conversation_initiation >= 0 AND conversation_initiation <= 100),
  ADD COLUMN IF NOT EXISTS vulnerability INTEGER CHECK (vulnerability >= 0 AND vulnerability >= 0),
  ADD COLUMN IF NOT EXISTS feedback_style INTEGER CHECK (feedback_style >= 0 AND feedback_style <= 100);

-- Add comment explaining the columns
COMMENT ON COLUMN contact_sliders.listening_style IS 'Listening Style: 0=Active Listening, 100=Offering Solutions';
COMMENT ON COLUMN contact_sliders.response_timing IS 'Response Timing: 0=Immediate, 100=Let Them Sit';
COMMENT ON COLUMN contact_sliders.emotional_expression IS 'Emotional Expression: 0=Reserved, 100=Very Expressive';
COMMENT ON COLUMN contact_sliders.problem_depth IS 'Problem Discussion: 0=Surface Level, 100=Deep Dive';
COMMENT ON COLUMN contact_sliders.accountability IS 'Accountability: 0=Gentle, 100=Hold Them Accountable';
COMMENT ON COLUMN contact_sliders.reassurance_level IS 'Reassurance: 0=Minimal, 100=Constant Reassurance';
COMMENT ON COLUMN contact_sliders.conversation_initiation IS 'Conversation Initiation: 0=Wait for Them, 100=Always Initiate';
COMMENT ON COLUMN contact_sliders.vulnerability IS 'Vulnerability: 0=Private, 100=Very Open';
COMMENT ON COLUMN contact_sliders.feedback_style IS 'Feedback Style: 0=Sandwich Approach, 100=Direct Feedback';

-- Update the updated_at trigger to include new columns (if you have one)
-- This is optional and depends on your trigger setup

-- Verification query (run after migration)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'contact_sliders'
-- ORDER BY ordinal_position;

