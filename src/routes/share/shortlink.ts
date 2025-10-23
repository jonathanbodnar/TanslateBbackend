import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';
import { randomBytes } from 'crypto';

const Body = z.object({ target_url: z.string().url(), utm: z.record(z.any()).optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/shortlink', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const code = randomBytes(4).toString('hex');
    const { error } = await supabaseService.from('shortlinks').insert({ code, target_url: parse.data.target_url, utm: parse.data.utm ?? {} });
    if (error) return reply.code(500).send({ error: 'db_error' });
    return reply.send({ code, url: `${process.env.SHORTLINK_BASE ?? ''}/${code}` });
  });
}

