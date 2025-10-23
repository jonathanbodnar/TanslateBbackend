import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../../config';
import { rateLimit } from '../../middleware/rateLimit';
import { supabaseService } from '../../lib/supabase';

const Body = z.object({ 
  base_text: z.string().min(1), 
  mode: z.enum(['4','8']), 
  persona_hints: z.any().optional(), 
  frictions_top: z.array(z.string()).optional(),
  recipient_id: z.string().uuid().optional(), // NEW: Optional contact ID
});

export default async function register(app: FastifyInstance) {
  app.post('/api/translate/generate', async (req, reply) => {
    const limiter = rateLimit(60);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    if (!(await limiter(`gen:${ip}`))) return reply.code(429).send({ error: 'rate_limited' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { mode, base_text, recipient_id } = parse.data;
    
    // Fetch contact sliders if recipient_id provided
    let contactSliders = null;
    let contactName = null;
    let relationshipType = null;
    
    if (recipient_id && req.userId) {
      try {
        const { data: contact, error: contactError } = await supabaseService
          .from('contacts')
          .select(`
            id,
            name,
            relationship_type,
            contact_sliders (
              directness,
              formality,
              warmth,
              support,
              humor,
              teasing,
              listening_style,
              response_timing,
              emotional_expression,
              problem_depth,
              accountability,
              reassurance_level,
              conversation_initiation,
              vulnerability,
              feedback_style
            )
          `)
          .eq('id', recipient_id)
          .eq('user_id', req.userId)
          .single();

        if (!contactError && contact && contact.contact_sliders) {
          contactName = contact.name;
          relationshipType = contact.relationship_type;
          contactSliders = Array.isArray(contact.contact_sliders) 
            ? contact.contact_sliders[0] 
            : contact.contact_sliders;
        }
      } catch (error) {
        // Graceful fallback - continue with generic translation
        console.error('Failed to fetch contact sliders:', error);
      }
    }
    
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const styles4 = ['Thinker','Feeler','Sensor','Intuition'];
    const styles8 = ['Te','Ti','Fe','Fi','Se','Si','Ni','Ne'];
    const styles = mode === '4' ? styles4 : styles8;
    
    // Build prompt with optional recipient context
    let systemPrompt = '';
    let userPrompt = '';
    
    if (contactSliders && contactName) {
      // Relationship-aware prompt
      const getLabel = (value: number) => {
        if (value > 70) return 'high';
        if (value < 30) return 'low';
        return 'moderate';
      };
      
      systemPrompt = `You are a relationship-aware communication translator. You translate messages into different communication styles while adapting to the recipient's preferences.

You MUST respond with ONLY valid JSON in this exact format:
{
  "translations": {
    ${styles.map(s => `"${s}": "translated text here"`).join(',\n    ')}
  }
}

Each translation should:
1. Be under 2 sentences
2. Be clear and respectful
3. Maintain the core meaning
4. Adapt to the recipient's communication style`;

      userPrompt = `Recipient: ${contactName}${relationshipType ? ` (${relationshipType})` : ''}

Communication Preferences:
- Directness: ${contactSliders.directness}/100 (${getLabel(contactSliders.directness)}) - ${contactSliders.directness > 70 ? 'prefers direct, straightforward' : contactSliders.directness < 30 ? 'prefers cushioned, gentle' : 'balanced'}
- Formality: ${contactSliders.formality}/100 - ${contactSliders.formality > 70 ? 'formal/professional' : contactSliders.formality < 30 ? 'casual/relaxed' : 'balanced'}
- Warmth: ${contactSliders.warmth}/100 - ${contactSliders.warmth > 70 ? 'warm, affectionate language' : 'neutral tone'}
- Emotional Expression: ${contactSliders.emotional_expression}/100 - ${contactSliders.emotional_expression > 70 ? 'expressive language OK' : 'reserved tone'}
- Reassurance: ${contactSliders.reassurance_level}/100 - ${contactSliders.reassurance_level > 70 ? 'needs reassurance' : 'minimal reassurance'}

Base message to translate: "${base_text}"

Return JSON with ${styles.length} translations (${styles.join(', ')}) adapted to ${contactName}'s preferences.`;
    } else {
      // Generic prompt (original behavior)
      systemPrompt = `You are a communication style translator. You translate messages into different communication styles.

You MUST respond with ONLY valid JSON in this exact format:
{
  "translations": {
    ${styles.map(s => `"${s}": "translated text here"`).join(',\n    ')}
  }
}

Each translation should be under 2 sentences, clear, and respectful.`;

      userPrompt = `Base message to translate: "${base_text}"

Return JSON with ${styles.length} translations using these styles: ${styles.join(', ')}.`;
    }
    
    const comp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    const text = comp.choices[0]?.message?.content ?? '{}';
    let translations: Record<string, string> = {};
    
    try {
      const parsed = JSON.parse(text);
      translations = parsed.translations || {};
      
      // Ensure all expected styles are present
      styles.forEach(style => {
        if (!translations[style]) {
          translations[style] = base_text; // Fallback to original text
        }
      });
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      // Fallback: return original text for all styles
      styles.forEach(style => {
        translations[style] = base_text;
      });
    }
    
    // Include recipient info in response
    return reply.send({ 
      mode, 
      translations,
      recipient: contactName ? {
        id: recipient_id,
        name: contactName,
        relationship_type: relationshipType,
      } : null,
    });
  });
}

