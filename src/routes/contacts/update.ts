import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

const Body = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  relationship_type: z.string().optional(),
});

export default async function register(app: FastifyInstance) {
  app.put('/api/contacts/:id', async (req, reply) => {
    if (!req.userId || !req.token) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const Params = z.object({ id: z.string().uuid() });
    const parseP = Params.safeParse((req as any).params);
    
    if (!parseP.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }

    const parse = Body.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }

    const db = supabaseForUser(req.token);
    
    // Verify contact belongs to user
    const { data: contact, error: checkError } = await db
      .from('contacts')
      .select('id')
      .eq('id', parseP.data.id)
      .single();
    
    if (checkError || !contact) {
      return reply.code(404).send({ error: 'contact_not_found' });
    }
    
    // Update contact
    const { error } = await db
      .from('contacts')
      .update(parse.data)
      .eq('id', parseP.data.id);
    
    if (error) {
      return reply.code(500).send({ error: 'db_error' });
    }
    
    return reply.send({ ok: true });
  });
}

