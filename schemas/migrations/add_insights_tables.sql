-- Add insights tables for ProfileService
-- This migration updates the existing insights table and adds insight_likes table

-- =====================================================
-- UPDATE INSIGHTS TABLE
-- =====================================================
-- Add missing columns to existing insights table
ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS icon TEXT;

ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.insights
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update type constraint to match ProfileService types
ALTER TABLE public.insights 
DROP CONSTRAINT IF EXISTS insights_type_check;

ALTER TABLE public.insights
ADD CONSTRAINT insights_type_check 
CHECK (type IN ('trigger', 'pattern', 'breakthrough', 'mirror', 'communication', 'growth', 'realization'));

-- =====================================================
-- INSIGHT LIKES TABLE
-- =====================================================
-- Tracks which insights users have liked/bookmarked
CREATE TABLE IF NOT EXISTS public.insight_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(type);
CREATE INDEX IF NOT EXISTS idx_insight_likes_user_id ON public.insight_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_likes_insight_id ON public.insight_likes(insight_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_likes ENABLE ROW LEVEL SECURITY;

-- Users can read their own insights
CREATE POLICY "Users can read own insights"
  ON public.insights FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert insights (for AI generation)
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
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.insights IS 'AI-generated insights about user patterns, triggers, and growth';
COMMENT ON TABLE public.insight_likes IS 'User likes/bookmarks for insights';
COMMENT ON COLUMN public.insights.type IS 'Type of insight: trigger, pattern, breakthrough, or mirror';
COMMENT ON COLUMN public.insights.metadata IS 'Additional data like source_session_id, confidence_score, etc.';

