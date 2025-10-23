import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ 
  session_id: z.string().uuid().optional(), // Make optional for direct access users
  wimts_session_id: z.string().uuid().nullable().optional(), // Allow null values for WIMTS session tracking
  option_id: z.string().min(1) 
});

export default async function register(app: FastifyInstance) {
  app.post('/api/wimts/select', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    
    const { wimts_session_id, option_id } = parse.data;
    
    // If no wimts_session_id, just return the selection without storing
    // This handles direct access users who don't have a WIMTS session
    if (!wimts_session_id) {
      return reply.send({ chosen_option_id: option_id });
    }
    
    // Store the user's selection in the database
    try {
      const { error: selectionError } = await supabaseService
        .from('wimts_selections')
        .insert({
          wimts_session_id,
          option_id
        });

      if (selectionError) {
        console.error('Failed to store WIMTS selection:', selectionError);
        // Continue without storing - don't break the user experience
      }
    } catch (error) {
      console.error('Database error in WIMTS select:', error);
      // Continue without storing - don't break the user experience
    }
    
    return reply.send({ chosen_option_id: option_id });
  });
}

