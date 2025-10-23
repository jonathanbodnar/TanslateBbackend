import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { profileService } from '../../lib/profileService';

const ParamsSchema = z.object({
  userId: z.string().uuid()
});

export default async function register(app: FastifyInstance) {
  app.get('/api/profile/:userId', async (req, reply) => {
    // Check authentication
    if (!req.userId) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    
    // Validate params
    const parse = ParamsSchema.safeParse(req.params);
    if (!parse.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }
    
    const { userId } = parse.data;
    
    // Users can only access their own profile
    if (userId !== req.userId) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    
    try {
      // Generate profile snapshot using AI
      const snapshot = await profileService.generateProfileSnapshot(userId);
      return reply.send(snapshot);
    } catch (error) {
      console.error('Profile generation failed:', error);
      return reply.code(500).send({ error: 'profile_generation_failed' });
    }
  });
}

