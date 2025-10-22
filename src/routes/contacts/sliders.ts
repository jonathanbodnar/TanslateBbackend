import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

const Body = z.object({
  // Core sliders (6)
  directness: z.number().int().min(0).max(100).optional(),
  formality: z.number().int().min(0).max(100).optional(),
  warmth: z.number().int().min(0).max(100).optional(),
  support: z.number().int().min(0).max(100).optional(),
  humor: z.number().int().min(0).max(100).optional(),
  teasing: z.number().int().min(0).max(100).optional(),
  
  // Advanced sliders (9)
  listening_style: z.number().int().min(0).max(100).optional(),
  response_timing: z.number().int().min(0).max(100).optional(),
  emotional_expression: z.number().int().min(0).max(100).optional(),
  problem_depth: z.number().int().min(0).max(100).optional(),
  accountability: z.number().int().min(0).max(100).optional(),
  reassurance_level: z.number().int().min(0).max(100).optional(),
  conversation_initiation: z.number().int().min(0).max(100).optional(),
  vulnerability: z.number().int().min(0).max(100).optional(),
  feedback_style: z.number().int().min(0).max(100).optional(),
});

export default async function register(app: FastifyInstance) {
  app.put('/api/contacts/:id/sliders', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const Params = z.object({ id: z.string().uuid() });
    const parseP = Params.safeParse((req as any).params);
    if (!parseP.success) return reply.code(400).send({ error: 'invalid_params' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const db = supabaseForUser(req.token);
    const { error } = await db.from('contact_sliders').update(parse.data).eq('contact_id', parseP.data.id);
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ ok: true });
  });
}

