import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const Body = z.object({ insight_id: z.string().uuid() });

export default async function register(app: FastifyInstance) {
  app.post('/api/insights/like', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    // MVP: acknowledge like (persistence optional for now)
    return reply.send({ ok: true });
  });
}

