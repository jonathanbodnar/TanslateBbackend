import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../../config';
import { rateLimit } from '../../middleware/rateLimit';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ 
  session_id: z.string().uuid().optional(), // Make optional for direct access users
  intake_text: z.string().min(1), 
  profile: z.any() 
});

export default async function register(app: FastifyInstance) {
  app.post('/api/wimts/generate', async (req, reply) => {
    const limiter = rateLimit(60);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    if (!(await limiter(`gen:${ip}`))) return reply.code(429).send({ error: 'rate_limited' });
    
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    
    const { session_id, intake_text, profile } = parse.data;
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    
    // Build personalized prompt based on user profile
    let prompt = `User text: ${intake_text}\n`;
    
    if (profile && profile.cognitive_snapshot) {
      const cognitive = profile.cognitive_snapshot;
      prompt += `\nUser's communication style:\n`;
      prompt += `- Dominant streams: ${cognitive.dominant_streams?.join(', ') || 'Not specified'}\n`;
      prompt += `- Processing tendencies: ${cognitive.processing_tendencies?.join(', ') || 'Not specified'}\n`;
      prompt += `- Communication lens (outgoing): N:${cognitive.communication_lens?.outgoing?.N || 0}, S:${cognitive.communication_lens?.outgoing?.S || 0}, T:${cognitive.communication_lens?.outgoing?.T || 0}, F:${cognitive.communication_lens?.outgoing?.F || 0}\n`;
    }
    
    prompt += `\nReturn three concise, kind, and clear "What I Really Meant to Say" options labeled A, B, C that reflect the user's communication style and help them express their true intentions more effectively.`;
    
    const comp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    
    const text = comp.choices[0]?.message?.content ?? '';
    const lines = text.split('\n').filter(Boolean).slice(0, 3);
    const what_i_meant_variants = lines.map((line, idx) => ({ 
      option_id: ['A','B','C'][idx] || `O${idx+1}`, 
      title: `Option ${['A','B','C'][idx] || idx+1}`, 
      body: line.replace(/^[-*\s]*/,'') 
    }));

    // Store WIMTS session and options in database
    let wimtsSessionId: string | null = null;
    try {
      // Only try to store if we have a user ID
      if (req.userId) {
        // Create WIMTS session - session_id is now optional and doesn't need to exist in intake_sessions
        const { data: wimtsSession, error: sessionError } = await supabaseService
          .from('wimts_sessions')
          .insert({
            session_id: session_id || null, // Can be null for direct access users
            user_id: req.userId,
            intake_text,
            profile_snapshot: profile || null
          })
          .select('id')
          .single();

        if (sessionError) {
          console.error('Failed to create WIMTS session:', sessionError);
          // Continue without storing - don't break the user experience
        } else {
          wimtsSessionId = wimtsSession.id;
          // Store WIMTS options
          const optionsToInsert = what_i_meant_variants.map(option => ({
            wimts_session_id: wimtsSession.id,
            option_id: option.option_id,
            title: option.title,
            body: option.body
          }));

          const { error: optionsError } = await supabaseService
            .from('wimts_options')
            .insert(optionsToInsert);

          if (optionsError) {
            console.error('Failed to store WIMTS options:', optionsError);
            // Continue without storing - don't break the user experience
          }
        }
      }
    } catch (error) {
      console.error('Database error in WIMTS generate:', error);
      // Continue without storing - don't break the user experience
    }

    return reply.send({ 
      what_i_meant_variants,
      wimts_session_id: wimtsSessionId
    });
  });
}

