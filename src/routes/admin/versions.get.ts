import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/admin/versions/:config_id', async (req, reply) => {
    const Params = z.object({ config_id: z.string().min(3) });
    const parse = Params.safeParse((req as any).params);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_params' });
    const { data, error } = await supabaseService.from('admin_configs').select('*').eq('config_id', parse.data.config_id).single();
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send(data);
  });
}

