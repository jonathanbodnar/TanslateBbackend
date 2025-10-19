import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';
import { rateLimit } from '../../middleware/rateLimit';

const Body = z.object({ story_text: z.string().min(1).max(2000), mode: z.enum(['quick','full']) });

export default async function register(app: FastifyInstance) {
  app.post('/api/intake/session.start', async (req, reply) => {
    const limiter = rateLimit(30);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    if (!(await limiter(`intake:${ip}`))) return reply.code(429).send({ error: 'rate_limited' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { story_text, mode } = parse.data;
    const userId = req.userId ?? null;
    const { data, error } = await supabaseService
      .from('intake_sessions')
      .insert({ user_id: userId, mode, story_text })
      .select('id')
      .single();
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ session_id: data.id, next: 'cards' });
  });
}

