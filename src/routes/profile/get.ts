import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export default async function register(app: FastifyInstance) {
  app.get('/api/profile/:userId', async (req, reply) => {
    const Params = z.object({ userId: z.string().uuid() });
    const parse = Params.safeParse((req as any).params);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_params' });
    const payload = {
      user_id: parse.data.userId,
      cognitive_snapshot: { dominant_streams: ['Feeling','Intuition'], shadow_streams: ['Thinking','Sensation'], processing_tendencies: ['Seeks consensus','Reads between lines'], blind_spots: ['Overlooks hard data'], trigger_probability_index: 0.29, communication_lens: { incoming: { N: 0.72, S: 0.28, T: 0.31, F: 0.81 }, outgoing: { N: 0.65, S: 0.22, T: 0.25, F: 0.88 } } },
      fear_snapshot: { fears: [{ key: 'unworthiness', pct: 0.46 }, { key: 'unlovability', pct: 0.31 }, { key: 'powerlessness', pct: 0.15 }, { key: 'unsafety', pct: 0.08 }], heat_map: [[0.1,0.2],[0.2,0.5]], geometry: { cube: { x: 0.46, y: 0.31, z: 0.15, d: 0.08 } }, top3: ['unworthiness','unlovability','powerlessness'] },
      insights_snapshot: { feed: [], mirror_moments: 0, inner_dialogue_replay: [] },
      metadata: { generated_at: new Date().toISOString(), config_version: 'cfg_mvp_1' }
    };
    return reply.send(payload);
  });
}

