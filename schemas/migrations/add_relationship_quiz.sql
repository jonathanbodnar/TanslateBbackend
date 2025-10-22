-- Migration: Add Relationship Quiz Tables
-- Date: October 21, 2025
-- Purpose: Support 5-6 card relationship mini-quiz with adaptive questions

-- Create relationship_quiz_responses table
CREATE TABLE IF NOT EXISTS public.relationship_quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  card_number INT NOT NULL, -- 1-6 (Card 6 is conditional)
  card_type TEXT NOT NULL, -- 'reflexes', 'frustrations', 'fears', 'hopes', 'derails', 'conditional'
  question TEXT NOT NULL, -- The actual question shown (may be adapted)
  input_type TEXT NOT NULL, -- 'text', 'multi_select', 'single_select', 'slider'
  answer JSONB NOT NULL, -- Flexible format based on input_type
  ai_extracted_patterns JSONB, -- Patterns extracted by AI
  confidence_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON public.relationship_quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_contact_id ON public.relationship_quiz_responses(contact_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_created_at ON public.relationship_quiz_responses(created_at DESC);

-- Create composite index for user's quiz history per contact
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_contact ON public.relationship_quiz_responses(user_id, contact_id, created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.relationship_quiz_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own quiz responses" ON public.relationship_quiz_responses;
DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON public.relationship_quiz_responses;
DROP POLICY IF EXISTS "Users can update their own quiz responses" ON public.relationship_quiz_responses;
DROP POLICY IF EXISTS "Users can delete their own quiz responses" ON public.relationship_quiz_responses;

-- Users can only view their own quiz responses
CREATE POLICY "Users can view their own quiz responses"
  ON public.relationship_quiz_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own quiz responses
CREATE POLICY "Users can insert their own quiz responses"
  ON public.relationship_quiz_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own quiz responses
CREATE POLICY "Users can update their own quiz responses"
  ON public.relationship_quiz_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own quiz responses
CREATE POLICY "Users can delete their own quiz responses"
  ON public.relationship_quiz_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_responses_updated_at ON public.relationship_quiz_responses;

CREATE TRIGGER quiz_responses_updated_at
  BEFORE UPDATE ON public.relationship_quiz_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_responses_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationship_quiz_responses TO authenticated;

COMMENT ON TABLE public.relationship_quiz_responses IS 'Stores user responses to relationship mini-quiz for each contact';
COMMENT ON COLUMN public.relationship_quiz_responses.card_type IS 'Type of quiz card: reflexes, frustrations, fears, hopes, derails, conditional';
COMMENT ON COLUMN public.relationship_quiz_responses.input_type IS 'UI input type: text, multi_select, single_select, slider';
COMMENT ON COLUMN public.relationship_quiz_responses.answer IS 'User answer in flexible JSONB format';
COMMENT ON COLUMN public.relationship_quiz_responses.ai_extracted_patterns IS 'AI-extracted patterns and insights from the answer';

