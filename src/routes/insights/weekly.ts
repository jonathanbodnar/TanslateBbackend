import { FastifyInstance } from 'fastify';

export default async function register(app: FastifyInstance) {
  app.get('/api/insights/weekly', async (_req, reply) => {
    return reply.send({ summary: 'You noticed recurring confusion around ownership and made a clear ask twice.', top_themes: ['ownership','clarity'], mirror_moments: 3 });
  });
}

