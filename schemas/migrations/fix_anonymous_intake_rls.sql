-- Migration: Fix RLS policies for anonymous intake sessions
-- This allows anonymous users to create intake sessions and answers

-- Drop existing policies
DROP POLICY IF EXISTS intake_sessions_rw ON public.intake_sessions;
DROP POLICY IF EXISTS intake_answers_rw ON public.intake_answers;
DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;

-- Create updated policies that allow anonymous users
CREATE POLICY intake_sessions_rw ON public.intake_sessions
  FOR ALL USING (
    user_id = auth.uid() OR user_id IS NULL
  ) WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

CREATE POLICY intake_answers_rw ON public.intake_answers
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.intake_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  )) WITH CHECK (EXISTS(
    SELECT 1 FROM public.intake_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

-- Update analytics policy to allow anonymous users to view their events
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
