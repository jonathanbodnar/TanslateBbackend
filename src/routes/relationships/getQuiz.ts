import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { relationshipQuizService } from '../../lib/relationshipQuizService.js';
import { supabaseService } from '../../lib/supabase.js';

const ParamsSchema = z.object({
  contactId: z.string().uuid(),
});

export async function getQuiz(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify authentication
    if (!request.userId) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    // Validate params
    const params = ParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params', details: params.error.issues });
    }

    const { contactId } = params.data;
    const userId = request.userId;

    // Verify contact belongs to user
    const { data: contact, error: contactError } = await supabaseService
      .from('contacts')
      .select('id, relationship_type')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (contactError || !contact) {
      return reply.code(404).send({ error: 'contact_not_found' });
    }

    // Check if user has already completed quiz
    const hasCompleted = await relationshipQuizService.hasCompletedQuiz(userId, contactId);

    if (hasCompleted) {
      // Return previous responses instead of new quiz
      const previousResponses = await relationshipQuizService.getQuizResponses(userId, contactId);
      return reply.send({
        completed: true,
        responses: previousResponses,
      });
    }

    // Fetch user profile for question adaptation
    const { data: userProfileData } = await supabaseService
      .from('intake_sessions')
      .select('profile_snapshot')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const userProfile = userProfileData?.profile_snapshot;

    // Generate quiz cards
    const cards = await relationshipQuizService.generateQuizQuestions(
      userId,
      contactId,
      contact.relationship_type,
      userProfile
    );

    return reply.send({
      completed: false,
      cards,
    });
  } catch (error) {
    console.error('Error in getQuiz:', error);
    return reply.code(500).send({ error: 'internal_server_error' });
  }
}

