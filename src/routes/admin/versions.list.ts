import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/admin/versions', async (_req, reply) => {
    const { data, error } = await supabaseService.from('admin_configs').select('config_id,status,author_user_id,created_at').order('created_at', { ascending: false }).limit(50);
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send(data);
  });
}

