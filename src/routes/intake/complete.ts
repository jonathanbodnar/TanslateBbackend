import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';
import OpenAI from 'openai';
import { env } from '../../config';
import { FIXED_QUICK_QUESTIONS, FixedQuestion } from '../../shared/intakeQuestions';

const Body = z.object({ session_id: z.string().uuid() });

export default async function register(app: FastifyInstance) {
  app.post('/api/intake/complete', async (req, reply) => {
    const parse = Body.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'invalid_body' });
    const { session_id } = parse.data;

    // Load session context
    const { data: sessionRow } = await supabaseService
      .from('intake_sessions')
      .select('story_text, mode')
      .eq('id', session_id)
      .maybeSingle();

    const { data: answerRows } = await supabaseService
      .from('intake_answers')
      .select('question_id, choice, intensity, created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    const questionsById = new Map<string, FixedQuestion>(
      (FIXED_QUICK_QUESTIONS as FixedQuestion[]).map(q => [q.id, q])
    );

    const answers = (answerRows || []).map((a: any) => {
      const q = questionsById.get(a.question_id);
      return {
        question_id: a.question_id,
        headline: q?.headline ?? a.question_id,
        choice: a.choice,
        intensity: a.intensity,
        left_label: q?.leftLabel ?? 'Option A',
        right_label: q?.rightLabel ?? 'Option B'
      };
    });

    // Build prompt
    const system = 'You are a careful, plain-language assistant that summarizes interpersonal communication patterns. Output STRICT JSON that matches the provided schema. Do not include extra fields, comments, or prose. Follow safety rules: no diagnosis, no abusive content, scrub PII, be culturally sensitive.';
    const user = `Context:\n- Story: "${sessionRow?.story_text ?? ''}"\n- Mode: "${sessionRow?.mode ?? 'quick'}"\n\nQuizAnswers: ${JSON.stringify(answers)}\n\nTask:\nBased on the story and the choices (with intensity), produce a concise profile used to guide “What I Meant” and translation generation. Keep it practical and non-judgmental. Also produce a 2–3 line summary for the user that highlights the two dominant processing tendencies in bold (markdown **bold**), e.g., **feeling** and **sensing** when appropriate.\n\nRules:\n- lead/next: pick two top processing styles (e.g., "Horizon","Forge" or classic terms like "Feeling","Sensing").\n- mode: short label for how they process right now (e.g., "Inward-led").\n- frictions_top: 2–4 short descriptors (e.g., "Subtext","Rulebook","Pace","Precision").\n- fears: normalized numeric emphasis 0..1 for only: powerlessness, incompetence, betrayal.\n- summary_md: 2–3 short lines (sentences), markdown only, no HTML, with key styles in **bold**.\n- All numbers 0..1. JSON only, matching the schema exactly.\n\nSchema (JSON):\n{\n  "profile": {\n    "lead": "string",\n    "next": "string",\n    "mode": "string",\n    "frictions_top": ["string","string"],\n    "fears": {\n      "powerlessness": 0,\n      "incompetence": 0,\n      "betrayal": 0\n    },\n    "summary_md": "string"\n  }\n}`;

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const model = env.LLM_MODEL;

    async function generateProfile(): Promise<any | null> {
      try {
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.3,
          top_p: 1,
          response_format: { type: 'json_object' }
        });
        const txt = res.choices?.[0]?.message?.content ?? '';
        return JSON.parse(txt);
      } catch {
        return null;
      }
    }

    let ai = await generateProfile();
    if (!ai || !ai.profile || typeof ai.profile !== 'object') {
      // retry once
      ai = await generateProfile();
    }
    if (!ai || !ai.profile) {
      ai = { profile: { lead: 'Horizon', next: 'Forge', mode: 'Inward-led', frictions_top: ['Subtext','Rulebook'], fears: { powerlessness: 0.2, incompetence: 0.2, betrayal: 0.2 }, summary_md: 'You primarily process through **feeling** and **sensing**.\nYou tend to approach relationships with emotional awareness and practical thinking.' } };
    }

    // Store profile and mark session as completed
    await supabaseService
      .from('intake_sessions')
      .update({ 
        completed: true,
        profile_snapshot: ai.profile
      })
      .eq('id', session_id);

    return reply.send(ai);
  });
}

