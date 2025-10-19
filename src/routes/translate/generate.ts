import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../../config';
import { rateLimit } from '../../middleware/rateLimit';

const Body = z.object({ base_text: z.string().min(1), mode: z.enum(['4','8']), persona_hints: z.any().optional(), frictions_top: z.array(z.string()).optional() });

export default async function register(app: FastifyInstance) {
  app.post('/api/translate/generate', async (req, reply) => {
    const limiter = rateLimit(60);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    if (!(await limiter(`gen:${ip}`))) return reply.code(429).send({ error: 'rate_limited' });
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { mode, base_text } = parse.data;
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const styles4 = ['Thinker','Feeler','Sensor','Intuition'];
    const styles8 = ['Te','Ti','Fe','Fi','Se','Si','Ni','Ne'];
    const styles = mode === '4' ? styles4 : styles8;
    const prompt = `Base: ${base_text}\nReturn ${styles.length} translations labeled exactly with: ${styles.join(', ')}. Keep each under 2 sentences, clear, respectful, recipient-adaptive.`;
    const comp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    const text = comp.choices[0]?.message?.content ?? '';
    const lines = text.split('\n').filter(Boolean).slice(0, styles.length);
    const translations: Record<string, string> = {};
    styles.forEach((s, i) => {
      translations[s] = (lines[i] || '').replace(/^[-*\s]*/,'').replace(new RegExp(`^${s}\s*:\s*`, 'i'), '');
    });
    return reply.send({ mode, translations });
  });
}

