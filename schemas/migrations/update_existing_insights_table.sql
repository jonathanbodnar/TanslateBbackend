-- Update Existing Insights Table for ProfileService
-- This migration safely updates the existing insights table
-- Run this in Supabase SQL Editor
-- Date: October 21, 2025

-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING INSIGHTS TABLE
-- =====================================================

-- Add icon column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'insights' 
    AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.insights ADD COLUMN icon TEXT;
    RAISE NOTICE 'Added icon column';
  ELSE
    RAISE NOTICE 'icon column already exists';
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'insights' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.insights ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column';
  ELSE
    RAISE NOTICE 'metadata column already exists';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'insights' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.insights ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- =====================================================
-- UPDATE TYPE CONSTRAINT
-- =====================================================

-- Drop existing type constraint if it exists
ALTER TABLE public.insights 
DROP CONSTRAINT IF EXISTS insights_type_check;

-- Add new type constraint with all required types
ALTER TABLE public.insights
ADD CONSTRAINT insights_type_check 
CHECK (type IN ('trigger', 'pattern', 'breakthrough', 'mirror', 'communication', 'growth', 'realization'));

RAISE NOTICE 'Updated type constraint';

-- =====================================================
-- CREATE INSIGHT_LIKES TABLE IF NOT EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.insight_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(type);
CREATE INDEX IF NOT EXISTS idx_insight_likes_user_id ON public.insight_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_likes_insight_id ON public.insight_likes(insight_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP AND RECREATE POLICIES
-- =====================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can read own insights" ON public.insights;
DROP POLICY IF EXISTS "Service can insert insights" ON public.insights;
DROP POLICY IF EXISTS "Service can update insights" ON public.insights;
DROP POLICY IF EXISTS "Users can manage own likes" ON public.insight_likes;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.insights;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.insights;

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

-- =====================================================
-- VERIFY SCHEMA
-- =====================================================

-- Show the current insights table schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'insights'
ORDER BY ordinal_position;

-- Show policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('insights', 'insight_likes')
ORDER BY tablename, policyname;

