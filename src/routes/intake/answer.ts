import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().min(1),
  choice: z.enum(['left','right','neither']),
  intensity: z.number().int().min(0).max(2)
});

export default async function register(app: FastifyInstance) {
  app.post('/api/intake/answer', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { session_id, question_id, choice, intensity } = parse.data;
    const { error } = await supabaseService.from('intake_answers').insert({ session_id, question_id, choice, intensity });
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ ok: true });
  });
}

