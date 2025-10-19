import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const EventSchema = z.object({
  event: z.string(),
  ts: z.string(),
  user_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  page_id: z.string(),
  app_version: z.string(),
  payload: z.record(z.any()).optional()
});

const BatchSchema = z.object({
  events: z.array(EventSchema)
});

export default async function register(app: FastifyInstance) {
  app.post('/api/analytics', async (req, reply) => {
    const body = req.body as any;
    // Handle single event
    if (!Array.isArray(body) && !body.events) {
      const parse = EventSchema.safeParse(body);
      if (!parse.success) {
        req.log.warn({ body, error: parse.error }, 'Invalid analytics event');
        return reply.code(400).send({ error: 'invalid_event' });
      }
      
      try {
        await supabaseService
          .from('analytics_events')
          .insert({
            event: parse.data.event,
            ts: parse.data.ts,
            user_id: parse.data.user_id,
            session_id: parse.data.session_id,
            page_id: parse.data.page_id,
            app_version: parse.data.app_version,
            payload: parse.data.payload || {}
          });
      } catch (error) {
        console.error('Analytics tracking failed:', error);
        // Still return success to not break user experience
      }
      
      return reply.send({ ok: true });
    }
    
    // Handle batch events
    const parse = BatchSchema.safeParse(body);
    if (!parse.success) {
      req.log.warn({ body, error: parse.error }, 'Invalid analytics batch');
      return reply.code(400).send({ error: 'invalid_batch' });
    }
    
    try {
      await supabaseService
        .from('analytics_events')
        .insert(parse.data.events.map(e => ({
          event: e.event,
          ts: e.ts,
          user_id: e.user_id,
          session_id: e.session_id,
          page_id: e.page_id,
          app_version: e.app_version,
          payload: e.payload || {}
        })));
    } catch (error) {
      console.error('Analytics batch tracking failed:', error);
      // Still return success to not break user experience
    }
    
    return reply.send({ ok: true });
  });
}

