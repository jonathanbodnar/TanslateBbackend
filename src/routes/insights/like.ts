import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ insight_id: z.string() });

export default async function register(app: FastifyInstance) {
  app.post('/api/insights/like', async (req, reply) => {
    if (!req.userId) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const parse = Body.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }

    const { insight_id } = parse.data;
    const userId = req.userId;

    try {
      // Check if already liked
      const { data: existingLike } = await supabaseService
        .from('insight_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('insight_id', insight_id)
        .single();

      if (existingLike) {
        // Unlike - remove the like
        await supabaseService
          .from('insight_likes')
          .delete()
          .eq('user_id', userId)
          .eq('insight_id', insight_id);

        return reply.send({ liked: false, insight_id });
      } else {
        // Like - add the like
        await supabaseService
          .from('insight_likes')
          .insert({
            user_id: userId,
            insight_id
          });

        return reply.send({ liked: true, insight_id });
      }
    } catch (error) {
      console.error('Failed to toggle insight like:', error);
      return reply.code(500).send({ error: 'db_error' });
    }
  });
}

