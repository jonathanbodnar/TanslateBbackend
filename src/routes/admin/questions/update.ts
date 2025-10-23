import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/adminMiddleware';

/**
 * PUT /api/admin/questions/:id
 * Update an existing quiz question
 * Requires admin role
 */

const UpdateQuestionSchema = z.object({
  headline: z.string().min(1, 'Headline is required'),
  left_label: z.string().min(1, 'Left label is required'),
  right_label: z.string().min(1, 'Right label is required'),
  helper_text: z.string().optional().nullable(),
  category: z.enum(['communication', 'relationship', 'personality', 'fear']),
  is_active: z.boolean(),
});

type UpdateQuestionBody = z.infer<typeof UpdateQuestionSchema>;

export default async function register(app: FastifyInstance) {
  app.put<{ Params: { id: string }; Body: UpdateQuestionBody }>(
    '/api/admin/questions/:id',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        const { id } = req.params;

        // Validate request body
        const validated = UpdateQuestionSchema.safeParse(req.body);
        
        if (!validated.success) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: validated.error.issues
          });
        }

        const questionData = validated.data;

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

        // Update the question
        const { data: updatedQuestion, error } = await supabaseService
          .from('questions')
          .update({
            ...questionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating question:', error);
          return reply.code(500).send({ error: 'Failed to update question' });
        }

        return reply.send({
          question: updatedQuestion,
          message: 'Question updated successfully'
        });
      } catch (err) {
        console.error('Error in PUT /api/admin/questions/:id:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

