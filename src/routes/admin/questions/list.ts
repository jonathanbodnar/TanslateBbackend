import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/adminMiddleware';

/**
 * GET /api/admin/questions
 * List all quiz questions
 * Requires admin role
 */
export default async function register(app: FastifyInstance) {
  app.get(
    '/api/admin/questions',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        // Fetch all questions ordered by order_index
        const { data: questions, error } = await supabaseService
          .from('questions')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching questions:', error);
          return reply.code(500).send({ error: 'Failed to fetch questions' });
        }

        return reply.send({
          questions: questions || [],
          total: questions?.length || 0
        });
      } catch (err) {
        console.error('Error in GET /api/admin/questions:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

