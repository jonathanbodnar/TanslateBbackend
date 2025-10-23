import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({
  config_id: z.string().optional(),
  payload: z.any(),
  notes: z.string().optional()
});

export default async function register(app: FastifyInstance) {
  app.put('/api/admin/config', async (req, reply) => {
    // TODO: enforce admin/editor role
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const id = parse.data.config_id ?? `cfg_${Date.now()}`;
    const { error } = await supabaseService.from('admin_configs').upsert({
      config_id: id,
      status: 'draft',
      payload: parse.data.payload,
      author_user_id: req.userId ?? null
    });
    if (error) return reply.code(500).send({ error: 'db_error' });
    await supabaseService.from('admin_audit_log').insert({ actor_user_id: req.userId ?? null, action: 'save_draft', config_id: id, details: { notes: parse.data.notes ?? '' } });
    return reply.send({ config_id: id, status: 'draft' });
  });
}

