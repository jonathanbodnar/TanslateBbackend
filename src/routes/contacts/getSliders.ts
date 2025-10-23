import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

export default async function register(app: FastifyInstance) {
  app.get('/api/contacts/:id/sliders', async (req, reply) => {
    if (!req.userId || !req.token) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const Params = z.object({ id: z.string().uuid() });
    const parseP = Params.safeParse((req as any).params);
    
    if (!parseP.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }

    const db = supabaseForUser(req.token);
    
    // Verify contact belongs to user
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('id')
      .eq('id', parseP.data.id)
      .single();
    
    if (contactError || !contact) {
      return reply.code(404).send({ error: 'contact_not_found' });
    }

    // Get sliders
    const { data: sliders, error } = await db
      .from('contact_sliders')
      .select('*')
      .eq('contact_id', parseP.data.id)
      .single();

    if (error) {
      return reply.code(500).send({ error: 'db_error' });
    }

    return reply.send(sliders || {});
  });
}

