import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Query = z.object({ session_id: z.string().uuid() });

export default async function register(app: FastifyInstance) {
  app.get('/api/intake/questions', async (req, reply) => {
    const parse = Query.safeParse(req.query);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_query' });
    
    try {
      // Fetch active questions from database ordered by order_index
      const { data: questions, error } = await supabaseService
        .from('questions')
        .select('id, headline, left_label, right_label, helper_text')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching questions:', error);
        return reply.code(500).send({ error: 'database_error' });
      }

      // Transform to match API contract
      const formattedQuestions = questions?.map((q) => ({
        id: q.id,
        headline: q.headline,
        left: { label: q.left_label },
        right: { label: q.right_label },
        helper_text: q.helper_text ?? ''
      })) || [];

      return reply.send({ questions: formattedQuestions });
    } catch (error) {
      console.error('Unexpected error:', error);
      return reply.code(500).send({ error: 'internal_error' });
    }
  });
}

