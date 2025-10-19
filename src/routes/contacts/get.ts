import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/contacts/:id', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const Params = z.object({ id: z.string().uuid() });
    const parse = Params.safeParse((req as any).params);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_params' });
    const db = supabaseForUser(req.token);
    const { data, error } = await db.from('contacts').select('id,name,role,relationship_type,contact_sliders:contact_sliders(*)').eq('id', parse.data.id).single();
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send(data);
  });
}

