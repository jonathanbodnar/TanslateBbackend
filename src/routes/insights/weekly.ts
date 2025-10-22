import { FastifyInstance } from 'fastify';
import { insightsService } from '../../lib/insightsService';

export default async function register(app: FastifyInstance) {
  app.get('/api/insights/weekly', async (req, reply) => {
    // Require authentication
    if (!req.userId) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    try {
      const insights = await insightsService.generateWeeklyInsights(req.userId);
      return reply.send(insights);
    } catch (error) {
      console.error('Failed to generate weekly insights:', error);
      return reply.code(500).send({ 
        error: 'internal_error',
        summary: 'Unable to generate insights at this time. Please try again later.',
        top_themes: [],
        mirror_moments: 0,
        insights: []
      });
    }
  });
}

