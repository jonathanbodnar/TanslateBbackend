import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/profile/:userId/stats', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    // Authorization: Only users can see their own stats
    if (req.userId !== userId) {
      return reply.code(403).send({ error: 'forbidden' });
    }

    try {
      // Query 1: Reflection count (translations saved)
      const { count: reflectionCount } = await supabaseService
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Query 2: Intake session count (quizzes completed)
      const { count: quizCount } = await supabaseService
        .from('intake_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      // Query 3: Contact count (relationships tracked)
      const { count: contactCount } = await supabaseService
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Query 4: WIMTS session count
      const { count: wimtsCount } = await supabaseService
        .from('wimts_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Query 5: Insights count
      const { count: insightCount } = await supabaseService
        .from('insights')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Query 6: First session date (member since)
      const { data: firstSession } = await supabaseService
        .from('intake_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      return reply.send({
        reflection_count: reflectionCount || 0,
        quiz_count: quizCount || 0,
        contact_count: contactCount || 0,
        wimts_count: wimtsCount || 0,
        insight_count: insightCount || 0,
        member_since: firstSession?.created_at || null
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return reply.code(500).send({ error: 'internal_error' });
    }
  });
}

