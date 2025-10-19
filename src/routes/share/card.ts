import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const Body = z.object({ reflection_id: z.string().uuid().optional(), insight_id: z.string().uuid().optional(), privacy_flags: z.record(z.any()).optional(), template_id: z.string().optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/share/card', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    // MVP stub: return placeholder asset
    const assets = [{ type: 'png', url: 'https://via.placeholder.com/1024x512.png?text=TranslateB' }];
    return reply.send({ assets, short_url: null, template_id: parse.data.template_id ?? 'minimal_quote_v1' });
  });
}

