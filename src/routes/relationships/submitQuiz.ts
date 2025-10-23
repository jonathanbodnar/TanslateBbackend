import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { relationshipQuizService, QuizResponse } from '../../lib/relationshipQuizService.js';
import { supabaseService } from '../../lib/supabase.js';

const ParamsSchema = z.object({
  contactId: z.string().uuid(),
});

const BodySchema = z.object({
  responses: z.array(
    z.object({
      cardNumber: z.number().int().min(1).max(6),
      cardType: z.enum(['reflexes', 'frustrations', 'fears', 'hopes', 'derails', 'conditional']),
      question: z.string(),
      inputType: z.enum(['text', 'multi_select', 'single_select', 'slider']),
      answer: z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ),
});

export async function submitQuiz(request: FastifyRequest, reply: FastifyReply) {
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

    // Validate body
    const body = BodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'invalid_body', details: body.error.issues });
    }

    const { contactId } = params.data;
    const { responses } = body.data;
    const userId = request.userId;

    // Verify contact belongs to user
    const { data: contact, error: contactError } = await supabaseService
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (contactError || !contact) {
      return reply.code(404).send({ error: 'contact_not_found' });
    }

    // Store each response in the database
    for (const response of responses) {
      await relationshipQuizService.storeQuizResponse(
        userId,
        contactId,
        response.cardNumber,
        response.cardType,
        response.question,
        response.inputType,
        response.answer
      );
    }

    // Analyze responses and generate slider recommendations
    const analysis = await relationshipQuizService.analyzeQuizResponses(
      userId,
      contactId,
      responses as QuizResponse[]
    );

    // Generate conditional card if we have 5 responses and no card 6
    let conditionalCard = null;
    if (responses.length === 5 && !responses.find((r) => r.cardNumber === 6)) {
      // Fetch user profile for conditional card generation
      const { data: userProfileData } = await supabaseService
        .from('intake_sessions')
        .select('profile_snapshot')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      const userProfile = userProfileData?.profile_snapshot;

      conditionalCard = await relationshipQuizService.generateConditionalCard(
        responses as QuizResponse[],
        userProfile
      );
    }

    return reply.send({
      success: true,
      analysis,
      conditionalCard,
    });
  } catch (error) {
    console.error('Error in submitQuiz:', error);
    return reply.code(500).send({ error: 'internal_server_error' });
  }
}

