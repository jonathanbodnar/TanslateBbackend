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
    let prompt = '';
    
    if (contactSliders && contactName) {
      // Relationship-aware prompt
      const getLabel = (value: number) => {
        if (value > 70) return 'high';
        if (value < 30) return 'low';
        return 'moderate';
      };
      
      prompt = `You are a relationship-aware communication translator. You are adapting this message for ${contactName}${relationshipType ? ` (${relationshipType})` : ''}.

Communication Preferences for ${contactName}:
- Directness: ${contactSliders.directness}/100 (${getLabel(contactSliders.directness)}) - ${contactSliders.directness > 70 ? 'prefers direct, straightforward communication' : contactSliders.directness < 30 ? 'prefers cushioned, gentle communication' : 'balanced approach'}
- Formality: ${contactSliders.formality}/100 (${getLabel(contactSliders.formality)}) - ${contactSliders.formality > 70 ? 'formal and professional' : contactSliders.formality < 30 ? 'casual and relaxed' : 'balanced'}
- Warmth: ${contactSliders.warmth}/100 (${getLabel(contactSliders.warmth)}) - ${contactSliders.warmth > 70 ? 'appreciates warm, affectionate language' : 'neutral tone'}
- Support: ${contactSliders.support}/100 - ${contactSliders.support > 70 ? 'prefers problem-solving approach' : 'prefers empathetic listening'}
- Humor: ${contactSliders.humor}/100 - ${contactSliders.humor > 70 ? 'appreciates playful, light tone' : 'prefers serious tone'}
- Emotional Expression: ${contactSliders.emotional_expression}/100 - ${contactSliders.emotional_expression > 70 ? 'comfortable with expressive language' : 'prefers reserved tone'}
- Reassurance: ${contactSliders.reassurance_level}/100 - ${contactSliders.reassurance_level > 70 ? 'needs frequent reassurance' : 'minimal reassurance needed'}
- Vulnerability: ${contactSliders.vulnerability}/100 - ${contactSliders.vulnerability > 70 ? 'open to vulnerability' : 'prefers privacy'}
- Feedback Style: ${contactSliders.feedback_style}/100 - ${contactSliders.feedback_style > 70 ? 'direct feedback' : 'sandwich approach'}

IMPORTANT: Adapt the message to match ${contactName}'s communication style preferences above. Maintain the core meaning while adjusting tone, formality, and emotional expression.

Base message: ${base_text}

Return ${styles.length} translations labeled exactly with: ${styles.join(', ')}. Each translation should:
1. Respect ${contactName}'s communication preferences
2. Stay under 2 sentences
3. Be clear and respectful
4. Adapt the ${styles.join('/')} framework to ${contactName}'s style`;
    } else {
      // Generic prompt (original behavior)
      prompt = `Base: ${base_text}\nReturn ${styles.length} translations labeled exactly with: ${styles.join(', ')}. Keep each under 2 sentences, clear, respectful, recipient-adaptive.`;
    }
    const comp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    const text = comp.choices[0]?.message?.content ?? '';
    const lines = text.split('\n').filter(Boolean).slice(0, styles.length);
    const translations: Record<string, string> = {};
    styles.forEach((s, i) => {
      translations[s] = (lines[i] || '').replace(/^[-*\s]*/,'').replace(new RegExp(`^${s}\\s*:\\s*`, 'i'), '');
    });
    
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

