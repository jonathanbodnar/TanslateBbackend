import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseForUser } from '../../lib/supabase';

const Body = z.object({ name: z.string().min(1), role: z.string().optional(), relationship_type: z.string().optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/contacts', async (req, reply) => {
    if (!req.userId || !req.token) return reply.code(401).send({ error: 'unauthorized' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const db = supabaseForUser(req.token);
    
    // Create contact
    const { data, error } = await db
      .from('contacts')
      .insert({ 
        user_id: req.userId, 
        name: parse.data.name, 
        role: parse.data.role, 
        relationship_type: parse.data.relationship_type 
      })
      .select('id')
      .single();
    
    if (error) return reply.code(500).send({ error: 'db_error' });
    
    // Create default sliders (all set to 50 - neutral middle value)
    const { error: slidersError } = await db
      .from('contact_sliders')
      .insert({
        contact_id: data.id,
        // Core sliders (6)
        directness: 50,
        formality: 50,
        warmth: 50,
        support: 50,
        humor: 50,
        teasing: 50,
        // Advanced sliders (9)
        listening_style: 50,
        response_timing: 50,
        emotional_expression: 50,
        problem_depth: 50,
        accountability: 50,
        reassurance_level: 50,
        conversation_initiation: 50,
        vulnerability: 50,
        feedback_style: 50,
      });
    
    if (slidersError) {
      console.error('Failed to create default sliders:', slidersError);
      // Don't fail the request, contact is already created
      // Frontend will handle missing sliders gracefully
    }
    
    return reply.send({ contact_id: data.id });
  });
}

