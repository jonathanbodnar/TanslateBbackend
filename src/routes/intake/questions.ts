import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FIXED_QUICK_QUESTIONS, FixedQuestion } from '../../shared/intakeQuestions';

const Query = z.object({ session_id: z.string().uuid() });

export default async function register(app: FastifyInstance) {
  app.get('/api/intake/questions', async (req, reply) => {
    const parse = Query.safeParse(req.query);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_query' });
    const questions = (FIXED_QUICK_QUESTIONS as FixedQuestion[]).map((q) => ({
      id: q.id,
      headline: q.headline,
      left: { label: q.leftLabel },
      right: { label: q.rightLabel },
      helper_text: q.helperText ?? ''
    }));
    return reply.send({ questions });
  });
}

