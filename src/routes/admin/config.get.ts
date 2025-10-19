import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/admin/config', async (req, reply) => {
    // TODO: check admin role in production
    const { data, error } = await supabaseService.from('admin_configs').select('*').eq('status','published').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ current: data });
  });
}

