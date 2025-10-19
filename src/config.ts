import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  OPENAI_API_KEY: z.string().min(10),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  EMBEDDINGS_PROVIDER: z.string().default('openai'),
  EMBEDDINGS_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDINGS_DIM: z.coerce.number().default(1536),
  SHORTLINK_BASE: z.string().url().optional(),
  SHARE_OG_LOCKUP_URL: z.string().url().optional(),
  RATE_LIMIT_MAX_SESSIONS_PER_DAY: z.coerce.number().default(100),
  PORT: z.coerce.number().default(8080)
});
export const env = EnvSchema.parse(process.env);

