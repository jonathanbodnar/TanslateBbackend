import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ session_id: z.string().uuid() });

export default async function register(app: FastifyInstance) {
  app.post('/api/auth/claim-session', async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: 'unauthorized' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { session_id } = parse.data;
    const { error } = await supabaseService
      .from('intake_sessions')
      .update({ user_id: req.userId })
      .eq('id', session_id)
      .is('user_id', null);
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ ok: true });
  });
}


