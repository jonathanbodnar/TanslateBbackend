import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ config_id: z.string().min(3) });

export default async function register(app: FastifyInstance) {
  app.post('/api/admin/config/publish', async (req, reply) => {
    // TODO: enforce admin role
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { error } = await supabaseService.from('admin_configs').update({ status: 'published' }).eq('config_id', parse.data.config_id);
    if (error) {
      await supabaseService.from('admin_audit_log').insert({ actor_user_id: req.userId ?? null, action: 'publish_failed', config_id: parse.data.config_id, details: { error: error.message } });
      return reply.code(500).send({ error: 'db_error' });
    }
    await supabaseService.from('admin_audit_log').insert({ actor_user_id: req.userId ?? null, action: 'publish', config_id: parse.data.config_id, details: {} });
    return reply.send({ ok: true });
  });
}

