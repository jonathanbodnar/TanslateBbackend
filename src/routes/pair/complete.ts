import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const Body = z.object({ invite_id: z.string().min(3) });

export default async function register(app: FastifyInstance) {
  app.post('/api/pair/complete', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    return reply.send({ pair_summary: { theme: 'We both avoid direct asks' }, dual_card: { template_id: 'pair_split_v1', url: 'https://via.placeholder.com/1024x512.png?text=Pair' } });
  });
}

