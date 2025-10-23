import OpenAI from 'openai';
import { env } from '../config';

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    input: text,
    model: env.EMBEDDINGS_MODEL
  });
  return res.data[0].embedding as number[];
}

