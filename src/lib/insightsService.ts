import OpenAI from 'openai';
import { env } from '../config';
import { supabaseService } from './supabase';

export class InsightsService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  /**
   * Generate weekly insights for a user
   */
  async generateWeeklyInsights(userId: string) {
    // 1. Fetch recent reflections (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: reflections, error } = await supabaseService
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch reflections:', error);
      throw new Error('Failed to fetch reflections');
    }

    if (!reflections || reflections.length === 0) {
      return {
        summary: 'Not enough data yet. Complete a few more reflections to see your weekly insights!',
        top_themes: [],
        mirror_moments: 0,
        insights: []
      };
    }

    // Need at least 3 reflections for meaningful insights
    if (reflections.length < 3) {
      return {
        summary: `You've made ${reflections.length} reflection${reflections.length !== 1 ? 's' : ''} this week. Keep going! Your insights will become richer with more data.`,
        top_themes: [],
        mirror_moments: 0,
        insights: []
      };
    }

    // 2. Prepare data for AI analysis
    const reflectionTexts = reflections.map((r, idx) => 
      `Reflection ${idx + 1} (${new Date(r.created_at).toLocaleDateString()}):\nOriginal: "${r.base_intake_text}"\nChosen: "${r.translation_text || r.base_intake_text}"`
    ).join('\n\n');

    // 3. Generate AI analysis
    const prompt = `You are an AI communication coach analyzing a user's weekly communication patterns.

Here are their ${reflections.length} reflections from the past 7 days:

${reflectionTexts}

Analyze these reflections and provide:

1. A **weekly summary** (2-3 sentences) highlighting their main communication patterns and any growth observed
2. **Top 3 themes** - recurring topics or emotions (single words or short phrases like "clarity", "boundaries", "directness")
3. Number of **"mirror moments"** - times they had breakthroughs or significant self-awareness (be conservative - only count real insights)
4. **3-5 specific insights** - actionable observations about their communication style with categories:
   - "pattern" - recurring behavior
   - "breakthrough" - moment of growth
   - "blind_spot" - area for improvement
   - "strength" - what they're doing well

Be encouraging but honest. Focus on patterns, not individual events.

Format your response as valid JSON:
{
  "summary": "2-3 sentence summary here",
  "top_themes": ["theme1", "theme2", "theme3"],
  "mirror_moments": 0-3,
  "insights": [
    {
      "title": "Short insight title (4-6 words)",
      "content": "1-2 sentence description of the insight",
      "category": "pattern|breakthrough|blind_spot|strength"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // 4. Store insights in database
      if (result.insights && result.insights.length > 0) {
        const insightsToStore = result.insights.map((insight: any) => ({
          user_id: userId,
          title: insight.title,
          content: insight.content,
          category: insight.category || 'pattern',
          source: 'weekly_analysis',
          metadata: {
            week_start: sevenDaysAgo.toISOString(),
            week_end: new Date().toISOString(),
            reflection_count: reflections.length,
            generated_at: new Date().toISOString()
          }
        }));

        const { error: insertError } = await supabaseService
          .from('insights')
          .insert(insightsToStore);

        if (insertError) {
          console.error('Failed to store insights:', insertError);
          // Don't throw - still return the insights even if storage fails
        }
      }

      return {
        summary: result.summary || 'Keep reflecting to build your communication mirror!',
        top_themes: result.top_themes || [],
        mirror_moments: result.mirror_moments || 0,
        insights: result.insights || []
      };
    } catch (aiError) {
      console.error('OpenAI analysis failed:', aiError);
      
      // Fallback: Basic analysis without AI
      return {
        summary: `You've created ${reflections.length} reflections this week. Your communication mirror is building!`,
        top_themes: [],
        mirror_moments: 0,
        insights: []
      };
    }
  }

  /**
   * Detect communication patterns across all user reflections
   */
  async detectPatterns(userId: string, limit: number = 50) {
    // Fetch user's reflections
    const { data: reflections, error } = await supabaseService
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !reflections || reflections.length < 5) {
      return [];
    }

    // Analyze with AI
    const texts = reflections
      .map((r, idx) => `${idx + 1}. ${r.base_intake_text}`)
      .join('\n');
    
    const prompt = `Analyze these ${reflections.length} communication examples and identify 3-5 recurring patterns:

${texts}

Return patterns as JSON array. Be specific and actionable:
{
  "patterns": [
    {
      "pattern": "Brief description of the pattern",
      "frequency": "common|occasional|rare",
      "insight": "What this reveals about their communication style"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{"patterns":[]}');
      return result.patterns || [];
    } catch (error) {
      console.error('Pattern detection failed:', error);
      return [];
    }
  }

  /**
   * Detect mirror moments (communication breakthroughs)
   */
  async detectMirrorMoments(userId: string, limit: number = 20) {
    const { data: reflections, error } = await supabaseService
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !reflections || reflections.length === 0) {
      return [];
    }

    // Look for significant shifts in communication
    const comparisonText = reflections
      .map((r, i) => {
        const original = r.base_intake_text;
        const translated = r.translation_text || r.base_intake_text;
        return `${i + 1}. Original: "${original}"\n   Chosen: "${translated}"`;
      })
      .join('\n');

    const prompt = `Identify "mirror moments" - times when the user had a significant breakthrough in self-awareness or communication:

${comparisonText}

Look for:
- Major shifts from reactive to thoughtful communication
- Recognition of patterns they weren't aware of
- Growth in emotional intelligence
- Breakthroughs in clarity or directness

Return only the most significant moments (0-3 max):
{
  "moments": [
    {
      "reflection_number": 1-${reflections.length},
      "insight": "What they realized or shifted",
      "significance": "Why this matters for their growth"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{"moments":[]}');
      return result.moments || [];
    } catch (error) {
      console.error('Mirror moment detection failed:', error);
      return [];
    }
  }

  /**
   * Generate personalized communication tips based on patterns
   */
  async generateTips(userId: string) {
    const patterns = await this.detectPatterns(userId, 30);
    
    if (patterns.length === 0) {
      return [];
    }

    const patternText = patterns
      .map((p: any, idx: number) => `${idx + 1}. ${p.pattern} (${p.frequency})`)
      .join('\n');

    const prompt = `Based on these communication patterns, generate 3 actionable tips for improvement:

${patternText}

Return tips as JSON:
{
  "tips": [
    {
      "tip": "Specific, actionable advice (1 sentence)",
      "why": "Brief explanation of the benefit"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{"tips":[]}');
      return result.tips || [];
    } catch (error) {
      console.error('Tip generation failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const insightsService = new InsightsService();

