-- Fix Insights RLS Policies
-- Run this in Supabase SQL Editor to fix the RLS policy issues
-- Date: October 20, 2025

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================
-- This ensures no conflicts with existing policies
DROP POLICY IF EXISTS "Users can read own insights" ON public.insights;
DROP POLICY IF EXISTS "Service can insert insights" ON public.insights;
DROP POLICY IF EXISTS "Service can update insights" ON public.insights;
DROP POLICY IF EXISTS "Users can manage own likes" ON public.insight_likes;

-- Also drop any other potential conflicting policies
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.insights;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.insights;

-- =====================================================
-- ENSURE RLS IS ENABLED
-- =====================================================
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE NEW POLICIES
-- =====================================================

-- Users can read their own insights
CREATE POLICY "Users can read own insights"
  ON public.insights FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert insights (for AI generation)
-- WITH CHECK (true) allows any insert from service role
CREATE POLICY "Service can insert insights"
  ON public.insights FOR INSERT
  WITH CHECK (true);

-- Service role can update insights
CREATE POLICY "Service can update insights"
  ON public.insights FOR UPDATE
  USING (true);

-- Users can manage their own likes
CREATE POLICY "Users can manage own likes"
  ON public.insight_likes FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- VERIFY POLICIES
-- =====================================================
-- Run this to check policies are correctly created:
-- SELECT schemaname, tablename, policyname, permissive, cmd
-- FROM pg_policies
-- WHERE tablename IN ('insights', 'insight_likes');

