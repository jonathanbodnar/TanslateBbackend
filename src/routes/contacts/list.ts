import { FastifyInstance } from 'fastify';
import { supabaseForUser } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/contacts', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const db = supabaseForUser(req.token);
    const { data, error } = await db.from('contacts').select('id,name,role,relationship_type');
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send(data);
  });
}

