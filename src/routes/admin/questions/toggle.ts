import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/adminMiddleware';

/**
 * PUT /api/admin/questions/:id/toggle
 * Toggle the active status of a quiz question
 * Requires admin role
 */
export default async function register(app: FastifyInstance) {
  app.put<{ Params: { id: string } }>(
    '/api/admin/questions/:id/toggle',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        const { id } = req.params;

        // Get current question
        const { data: currentQuestion, error: fetchError } = await supabaseService
          .from('questions')
          .select('id, is_active')
          .eq('id', id)
          .single();

        if (fetchError || !currentQuestion) {
          return reply.code(404).send({
            error: 'Question not found',
            message: `No question found with ID "${id}"`
          });
        }

        // Toggle the status
        const newStatus = !currentQuestion.is_active;

        const { data: updatedQuestion, error: updateError } = await supabaseService
          .from('questions')
          .update({
            is_active: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error toggling question status:', updateError);
          return reply.code(500).send({ error: 'Failed to toggle question status' });
        }

        return reply.send({
          question: updatedQuestion,
          is_active: newStatus,
          message: `Question ${newStatus ? 'enabled' : 'disabled'} successfully`
        });
      } catch (err) {
        console.error('Error in PUT /api/admin/questions/:id/toggle:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

