-- Simple Migration: Add Missing Columns to Insights Table
-- Run this in Supabase SQL Editor
-- Date: October 21, 2025

-- Add missing columns (IF NOT EXISTS will skip if they already exist)
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update type constraint
ALTER TABLE public.insights DROP CONSTRAINT IF EXISTS insights_type_check;
ALTER TABLE public.insights ADD CONSTRAINT insights_type_check 
CHECK (type IN ('trigger', 'pattern', 'breakthrough', 'mirror', 'communication', 'growth', 'realization'));

-- Create insight_likes table if needed
CREATE TABLE IF NOT EXISTS public.insight_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(type);
CREATE INDEX IF NOT EXISTS idx_insight_likes_user_id ON public.insight_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_likes_insight_id ON public.insight_likes(insight_id);

-- Enable RLS
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_likes ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can read own insights" ON public.insights;
DROP POLICY IF EXISTS "Service can insert insights" ON public.insights;
DROP POLICY IF EXISTS "Service can update insights" ON public.insights;
DROP POLICY IF EXISTS "Users can manage own likes" ON public.insight_likes;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.insights;

-- Create new policies
CREATE POLICY "Users can read own insights"
  ON public.insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert insights"
  ON public.insights FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update insights"
  ON public.insights FOR UPDATE
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON public.insight_likes FOR ALL
  USING (auth.uid() = user_id);

