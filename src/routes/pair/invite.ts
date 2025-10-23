import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const Body = z.object({ to_contact: z.string().uuid(), channel: z.enum(['link','email','sms']).default('link') });

export default async function register(app: FastifyInstance) {
  app.post('/api/pair/invite', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    // MVP: return deeplink stub
    return reply.send({ invite_id: 'inv_'+parse.data.to_contact, deeplink: `${process.env.SHORTLINK_BASE ?? ''}/pair/${parse.data.to_contact}` });
  });
}

