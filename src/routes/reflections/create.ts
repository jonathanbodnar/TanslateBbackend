import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService, supabaseForUser } from '../../lib/supabase';
import { embed } from '../../lib/openai';

const Body = z.object({
  base_intake_text: z.string().min(1),
  wimts_option_id: z.string().min(1),
  translation_mode: z.enum(['4','8']),
  chosen_translation_key: z.string().min(1),
  translation_text: z.string().min(1),
  recipient_id: z.string().uuid().optional()
});

export default async function register(app: FastifyInstance) {
  app.post('/api/reflections', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const payload = parse.data;
    const userDb = supabaseForUser(req.token);
    const { data, error } = await userDb.from('reflections').insert({ user_id: req.userId, ...payload }).select('id').single();
    if (error) return reply.code(500).send({ error: 'db_error' });
    // Embed asynchronously (MVP: fire-and-forget)
    (async () => {
      try {
        const vector = await embed(`${payload.base_intake_text}\n${payload.translation_text}`);
        await supabaseService.rpc('upsert_reflection_embedding', { reflection_id: data.id, embedding: vector });
      } catch {}
    })();
    return reply.send({ reflection_id: data.id });
  });
}

