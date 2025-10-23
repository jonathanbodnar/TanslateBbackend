import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/reflections/:id/similar', async (req, reply) => {
    const Params = z.object({ id: z.string().uuid() });
    const parse = Params.safeParse((req as any).params);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_params' });
    const { data, error } = await supabaseService.rpc('similar_reflections', { p_reflection_id: parse.data.id, match_limit: 5 });
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send(data ?? []);
  });
}

