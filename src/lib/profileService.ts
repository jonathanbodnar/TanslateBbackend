import { supabaseService } from './supabase';
import OpenAI from 'openai';
import { env } from '../config';

export interface CognitiveSnapshot {
  dominant_streams: string[];
  shadow_streams: string[];
  processing_tendencies: string[];
  blind_spots: string[];
  trigger_probability_index: number;
  communication_lens: {
    incoming: { N: number; S: number; T: number; F: number };
    outgoing: { N: number; S: number; T: number; F: number };
  };
}

export interface FearSnapshot {
  fears: Array<{ key: string; pct: number }>;
  heat_map: number[][];
  geometry: { cube: { x: number; y: number; z: number; d: number } };
  top3: string[];
}

export interface Insight {
  insight_id: string;
  type: 'trigger' | 'pattern' | 'breakthrough' | 'mirror';
  icon: string;
  title: string;
  snippet: string;
  ts: string;
  tags: string[];
}

export interface InsightsSnapshot {
  feed: Insight[];
  mirror_moments: number;
  inner_dialogue_replay: Array<{ script: string; reframe: string }>;
}

export interface ProfileSnapshot {
  user_id: string;
  cognitive_snapshot: CognitiveSnapshot;
  fear_snapshot: FearSnapshot;
  insights_snapshot: InsightsSnapshot;
  metadata: {
    generated_at: string;
    config_version: string;
  };
}

export class ProfileService {
  async generateProfileSnapshot(userId: string): Promise<ProfileSnapshot> {
    // Get comprehensive user data from multiple sources
    const [reflections, sessions, wimtsSessions, wimtsSelections] = await Promise.all([
      // User's reflections
      supabaseService
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      
      // Intake sessions
      supabaseService
        .from('intake_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // WIMTS sessions with profile snapshots
      supabaseService
        .from('wimts_sessions')
        .select('*, wimts_options(*), wimts_selections(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
      
      // WIMTS selections for pattern analysis
      supabaseService
        .from('wimts_selections')
        .select('*, wimts_sessions!inner(*)')
        .eq('wimts_sessions.user_id', userId)
        .order('selected_at', { ascending: false })
        .limit(50)
    ]);

    // Generate cognitive snapshot using AI with enriched data
    const cognitiveSnapshot = await this.generateCognitiveSnapshot(
      reflections.data || [], 
      sessions.data || [], 
      wimtsSessions.data || [],
      wimtsSelections.data || []
    );
    
    // Generate fear snapshot
    const fearSnapshot = await this.generateFearSnapshot(
      reflections.data || [], 
      sessions.data || [], 
      wimtsSessions.data || []
    );
    
    // Generate insights snapshot
    const insightsSnapshot = await this.generateInsightsSnapshot(
      userId,
      reflections.data || [], 
      sessions.data || [], 
      wimtsSessions.data || [],
      wimtsSelections.data || []
    );

    return {
      user_id: userId,
      cognitive_snapshot: cognitiveSnapshot,
      fear_snapshot: fearSnapshot,
      insights_snapshot: insightsSnapshot,
      metadata: {
        generated_at: new Date().toISOString(),
        config_version: 'cfg_mvp_1'
      }
    };
  }

  private async generateCognitiveSnapshot(
    reflections: any[], 
    sessions: any[], 
    wimtsSessions: any[], 
    wimtsSelections: any[]
  ): Promise<CognitiveSnapshot> {
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      
      // Analyze WIMTS selection patterns
      const selectionPatterns = this.analyzeWIMTSSelections(wimtsSelections);
      const profileSnapshots = wimtsSessions
        .map(s => s.profile_snapshot)
        .filter(Boolean);
      
      const prompt = `Based on user's communication patterns from:
      - ${reflections.length} reflections
      - ${sessions.length} intake sessions  
      - ${wimtsSessions.length} WIMTS sessions
      - ${wimtsSelections.length} WIMTS selections
      - ${profileSnapshots.length} historical profile snapshots

      WIMTS Selection Patterns: ${JSON.stringify(selectionPatterns)}
      
      Historical Profile Data: ${JSON.stringify(profileSnapshots.slice(0, 3))}

      Generate a cognitive snapshot. Return JSON with EXACTLY this structure:
      {
        "dominant_streams": ["Feeling", "Intuition"],
        "shadow_streams": ["Thinking", "Sensing"],
        "processing_tendencies": ["empathetic", "pattern-seeking", "abstract thinking"],
        "blind_spots": ["details", "direct feedback"],
        "trigger_probability_index": 0.5,
        "communication_lens": {
          "incoming": { "N": 0.6, "S": 0.4, "T": 0.4, "F": 0.7 },
          "outgoing": { "N": 0.5, "S": 0.5, "T": 0.5, "F": 0.6 }
        }
      }

      IMPORTANT: communication_lens MUST have both "incoming" and "outgoing" objects, each with N, S, T, F keys.
      Be practical and non-judgmental.`;

      const response = await client.chat.completions.create({
        model: env.LLM_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Validate and fix communication_lens structure
      let communicationLens = result.communication_lens;
      if (!communicationLens || !communicationLens.incoming || !communicationLens.outgoing) {
        // If OpenAI returned a flat structure, convert it
        if (communicationLens && !communicationLens.incoming) {
          communicationLens = {
            incoming: { 
              N: communicationLens.N || 0.6, 
              S: communicationLens.S || 0.4, 
              T: communicationLens.T || 0.4, 
              F: communicationLens.F || 0.7 
            },
            outgoing: { 
              N: communicationLens.N || 0.5, 
              S: communicationLens.S || 0.5, 
              T: communicationLens.T || 0.5, 
              F: communicationLens.F || 0.6 
            }
          };
        } else {
          // Use default fallback
          communicationLens = {
            incoming: { N: 0.6, S: 0.4, T: 0.4, F: 0.7 },
            outgoing: { N: 0.5, S: 0.5, T: 0.5, F: 0.6 }
          };
        }
      }
      
      // Ensure all required fields with fallbacks
      return {
        dominant_streams: result.dominant_streams || ['Feeling', 'Intuition'],
        shadow_streams: result.shadow_streams || ['Thinking', 'Sensing'],
        processing_tendencies: result.processing_tendencies || ['empathetic', 'intuitive'],
        blind_spots: result.blind_spots || ['details', 'logic'],
        trigger_probability_index: result.trigger_probability_index || 0.5,
        communication_lens: communicationLens
      };
    } catch (error) {
      console.error('Cognitive snapshot generation failed:', error);
      // Return fallback
      return {
        dominant_streams: ['Feeling', 'Intuition'],
        shadow_streams: ['Thinking', 'Sensing'],
        processing_tendencies: ['empathetic', 'intuitive', 'pattern-seeking'],
        blind_spots: ['details', 'direct confrontation'],
        trigger_probability_index: 0.5,
        communication_lens: {
          incoming: { N: 0.6, S: 0.4, T: 0.4, F: 0.7 },
          outgoing: { N: 0.5, S: 0.5, T: 0.5, F: 0.6 }
        }
      };
    }
  }

  private analyzeWIMTSSelections(selections: any[]): any {
    const patterns: {
      option_preferences: Record<string, number>;
      total_selections: number;
      consistency_score: number;
    } = {
      option_preferences: { A: 0, B: 0, C: 0 },
      total_selections: selections.length,
      consistency_score: 0
    };

    selections.forEach(selection => {
      const optionId = selection.option_id || 'A';
      if (patterns.option_preferences[optionId] !== undefined) {
        patterns.option_preferences[optionId]++;
      }
    });

    // Calculate consistency
    const totalSelections = selections.length;
    const maxPreference = Math.max(...Object.values(patterns.option_preferences));
    patterns.consistency_score = totalSelections > 0 ? maxPreference / totalSelections : 0;

    return patterns;
  }

  private async generateFearSnapshot(
    reflections: any[], 
    sessions: any[], 
    wimtsSessions: any[]
  ): Promise<FearSnapshot> {
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      
      const fearIndicators = this.extractFearIndicators(reflections, sessions, wimtsSessions);
      
      const prompt = `Analyze user's fear patterns from:
      - ${reflections.length} reflections
      - ${sessions.length} intake sessions
      - ${wimtsSessions.length} WIMTS sessions

      Fear Indicators: ${JSON.stringify(fearIndicators)}

      Return JSON with:
      - fears: array of {key: string, pct: number} for fears like powerlessness, betrayal, incompetence
      - heat_map: 3x3 2D array of intensity values (0-1)
      - geometry: {cube: {x, y, z, d}} for 3D visualization
      - top3: top 3 fear keys

      Base on communication themes, not clinical assessment.`;

      const response = await client.chat.completions.create({
        model: env.LLM_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        fears: result.fears || [
          { key: 'powerlessness', pct: 0.4 },
          { key: 'betrayal', pct: 0.3 },
          { key: 'incompetence', pct: 0.3 }
        ],
        heat_map: result.heat_map || [[0.4,0.3,0.2],[0.3,0.5,0.3],[0.2,0.3,0.4]],
        geometry: result.geometry || { cube: { x: 0.4, y: 0.3, z: 0.3, d: 0.58 } },
        top3: result.top3 || ['powerlessness', 'betrayal', 'incompetence']
      };
    } catch (error) {
      console.error('Fear snapshot generation failed:', error);
      return {
        fears: [
          { key: 'powerlessness', pct: 0.4 },
          { key: 'betrayal', pct: 0.3 },
          { key: 'incompetence', pct: 0.3 }
        ],
        heat_map: [[0.4,0.3,0.2],[0.3,0.5,0.3],[0.2,0.3,0.4]],
        geometry: { cube: { x: 0.4, y: 0.3, z: 0.3, d: 0.58 } },
        top3: ['powerlessness', 'betrayal', 'incompetence']
      };
    }
  }

  private extractFearIndicators(reflections: any[], sessions: any[], wimtsSessions: any[]): any {
    return {
      total_data_points: reflections.length + sessions.length + wimtsSessions.length,
      wimts_completion_rate: wimtsSessions.length > 0 
        ? wimtsSessions.filter(s => s.completed).length / wimtsSessions.length 
        : 0,
      profile_evolution_count: wimtsSessions.filter(s => s.profile_snapshot).length
    };
  }

  private async generateInsightsSnapshot(
    userId: string,
    reflections: any[], 
    sessions: any[], 
    wimtsSessions: any[], 
    wimtsSelections: any[]
  ): Promise<InsightsSnapshot> {
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      
      const insightPatterns = this.generateInsightPatterns(wimtsSessions, wimtsSelections);
      
      const prompt = `Generate insights from communication journey:
      - ${reflections.length} reflections
      - ${sessions.length} intake sessions
      - ${wimtsSessions.length} WIMTS sessions
      - ${wimtsSelections.length} selections

      Patterns: ${JSON.stringify(insightPatterns)}

      Return JSON with:
      - feed: array of 3-5 insights with {insight_id, type, icon, title, snippet, ts, tags}
        types: trigger, pattern, breakthrough, mirror
        icons: 💡,🔥,✨,🪞
      - mirror_moments: count of self-awareness breakthroughs
      - inner_dialogue_replay: array of {script, reframe} pairs

      Focus on growth, patterns, and actionable insights.`;

      const response = await client.chat.completions.create({
        model: env.LLM_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Lower temperature for more deterministic results
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Fetch or create insights in database with stable content-based matching
      const feedWithIds: any[] = [];
      
      for (let index = 0; index < (result.feed || []).length; index++) {
        const insight = result.feed[index];
        
        try {
          // Check if insight with same title/snippet exists for this user
          const { data: existing } = await supabaseService
            .from('insights')
            .select('id')
            .eq('user_id', userId)
            .eq('title', insight.title)
            .eq('snippet', insight.snippet)
            .single();
          
          let insightId: string;
          
          if (existing) {
            // Update existing insight
            insightId = existing.id;
            await supabaseService
              .from('insights')
              .update({
                type: insight.type,
                icon: insight.icon,
                tags: insight.tags || [],
                metadata: {},
                updated_at: new Date().toISOString()
              })
              .eq('id', insightId);
          } else {
            // Create new insight
            const { data: newInsight } = await supabaseService
              .from('insights')
              .insert({
                user_id: userId,
                type: insight.type,
                icon: insight.icon,
                title: insight.title,
                snippet: insight.snippet,
                tags: insight.tags || []
              })
              .select('id')
              .single();
            
            insightId = newInsight!.id;
          }
          
          feedWithIds.push({
            ...insight,
            insight_id: insightId,
            ts: new Date().toISOString()
          });
        } catch (err) {
          console.error('Failed to store/fetch insight:', err);
          // Skip this insight if database operation fails
        }
      }
      
      // Fetch liked status for all insights
      const insightIds = feedWithIds.map((i: any) => i.insight_id);
      const { data: likes } = await supabaseService
        .from('insight_likes')
        .select('insight_id')
        .eq('user_id', userId)
        .in('insight_id', insightIds);
      
      const likedIds = new Set((likes || []).map((l: any) => l.insight_id));
      
      // Add liked status to insights
      const feedWithLikes = feedWithIds.map((insight: any) => ({
        ...insight,
        liked: likedIds.has(insight.insight_id)
      }));
      
      return {
        feed: feedWithLikes,
        mirror_moments: result.mirror_moments || 0,
        inner_dialogue_replay: result.inner_dialogue_replay || []
      };
    } catch (error) {
      console.error('Insights snapshot generation failed:', error);
      return {
        feed: [],
        mirror_moments: 0,
        inner_dialogue_replay: []
      };
    }
  }

  private generateInsightPatterns(wimtsSessions: any[], wimtsSelections: any[]): any {
    return {
      total_sessions: wimtsSessions.length,
      total_selections: wimtsSelections.length,
      completion_rate: wimtsSessions.length > 0
        ? wimtsSessions.filter(s => s.completed).length / wimtsSessions.length
        : 0,
      recent_activity: wimtsSessions.length > 0
        ? new Date(wimtsSessions[0].created_at).toISOString()
        : null
    };
  }

  // Simple hash function for generating stable IDs
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const profileService = new ProfileService();

