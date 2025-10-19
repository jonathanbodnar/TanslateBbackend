import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

const Body = z.object({ name: z.string().min(1), role: z.string().optional(), relationship_type: z.string().optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/contacts', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const db = supabaseForUser(req.token);
    const { data, error } = await db.from('contacts').insert({ user_id: req.userId, name: parse.data.name, role: parse.data.role, relationship_type: parse.data.relationship_type }).select('id').single();
    if (error) return reply.code(500).send({ error: 'db_error' });
    // create default sliders
    await db.from('contact_sliders').insert({ contact_id: data.id }).select().single();
    return reply.send({ contact_id: data.id });
  });
}

