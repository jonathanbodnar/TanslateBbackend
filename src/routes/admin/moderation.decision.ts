import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ item_id: z.string().min(3), decision: z.enum(['approve','reject']), reason: z.string().optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/admin/moderation/decision', async (req, reply) => {
    // TODO: enforce admin/editor role
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    await supabaseService.from('admin_audit_log').insert({ actor_user_id: req.userId ?? null, action: 'moderation_decision', details: parse.data });
    return reply.send({ ok: true });
  });
}

