import { FastifyInstance } from 'fastify';

export default async function register(app: FastifyInstance) {
  app.get('/api/public/wall', async (_req, reply) => {
    return reply.send([]);
  });
}

