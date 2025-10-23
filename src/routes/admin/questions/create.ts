import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/adminMiddleware';

/**
 * POST /api/admin/questions
 * Create a new quiz question
 * Requires admin role
 */

const CreateQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  headline: z.string().min(1, 'Headline is required'),
  left_label: z.string().min(1, 'Left label is required'),
  right_label: z.string().min(1, 'Right label is required'),
  helper_text: z.string().optional(),
  category: z.enum(['communication', 'relationship', 'personality', 'fear']),
  is_active: z.boolean().default(true),
});

type CreateQuestionBody = z.infer<typeof CreateQuestionSchema>;

export default async function register(app: FastifyInstance) {
  app.post<{ Body: CreateQuestionBody }>(
    '/api/admin/questions',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        // Validate request body
        const validated = CreateQuestionSchema.safeParse(req.body);
        
        if (!validated.success) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: validated.error.issues
          });
        }

        const questionData = validated.data;

        // Check if question ID already exists
        const { data: existing } = await supabaseService
          .from('questions')
          .select('id')
          .eq('id', questionData.id)
          .single();

        if (existing) {
          return reply.code(409).send({
            error: 'Question ID already exists',
            message: `A question with ID "${questionData.id}" already exists`
          });
        }

        // Get the highest order_index to append new question at the end
        const { data: lastQuestion } = await supabaseService
          .from('questions')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        const nextOrderIndex = lastQuestion ? lastQuestion.order_index + 1 : 0;

        // Create the question
        const { data: newQuestion, error } = await supabaseService
          .from('questions')
          .insert({
            ...questionData,
            order_index: nextOrderIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating question:', error);
          return reply.code(500).send({ error: 'Failed to create question' });
        }

        return reply.code(201).send({
          question: newQuestion,
          message: 'Question created successfully'
        });
      } catch (err) {
        console.error('Error in POST /api/admin/questions:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

