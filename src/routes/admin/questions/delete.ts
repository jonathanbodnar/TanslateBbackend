import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/adminMiddleware';

/**
 * DELETE /api/admin/questions/:id
 * Delete a quiz question
 * Requires admin role
 */
export default async function register(app: FastifyInstance) {
  app.delete<{ Params: { id: string } }>(
    '/api/admin/questions/:id',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        const { id } = req.params;

        // Check if question exists
        const { data: existing } = await supabaseService
          .from('questions')
          .select('id')
          .eq('id', id)
          .single();

        if (!existing) {
          return reply.code(404).send({
            error: 'Question not found',
            message: `No question found with ID "${id}"`
          });
        }

        // Delete the question
        const { error } = await supabaseService
          .from('questions')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting question:', error);
          return reply.code(500).send({ error: 'Failed to delete question' });
        }

        return reply.send({
          success: true,
          message: 'Question deleted successfully'
        });
      } catch (err) {
        console.error('Error in DELETE /api/admin/questions/:id:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

