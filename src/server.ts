import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config';
import registerRoutes from './routes/index';
import intakeQuestions from './routes/intake/questions';
import intakeAnswer from './routes/intake/answer';
import wimtsGen from './routes/wimts/generate';
import wimtsSelect from './routes/wimts/select';
import translateGen from './routes/translate/generate';
import profileGet from './routes/profile/get';
import contactsCreate from './routes/contacts/create';
import contactsList from './routes/contacts/list';
import contactsGet from './routes/contacts/get';
import contactsSliders from './routes/contacts/sliders';
import insightsLike from './routes/insights/like';
import insightsWeekly from './routes/insights/weekly';
import shareShortlink from './routes/share/shortlink';
import shareCard from './routes/share/card';
import shareWall from './routes/share/wall';
import pairInvite from './routes/pair/invite';
import pairComplete from './routes/pair/complete';
import adminConfigGet from './routes/admin/config.get';
import adminConfigPut from './routes/admin/config.put';
import adminConfigPublish from './routes/admin/config.publish';
import adminVersionsList from './routes/admin/versions.list';
import adminVersionsGet from './routes/admin/versions.get';
import adminModerationDecision from './routes/admin/moderation.decision';
import { requireAdmin } from './middleware/authz';
import analyticsIngest from './routes/analytics/ingest';
import reflectionsSimilar from './routes/reflections/similar';
import claimSession from './routes/auth/claimSession';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { supabaseService } from './lib/supabase';

const app = Fastify({ disableRequestLogging: false });

await app.register(cors, { origin: true });

// Supabase JWKS for auth verification
let jwks: any = null;
try {
  jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/keys`));
  console.log('JWKS endpoint configured:', `${env.SUPABASE_URL}/auth/v1/keys`);
} catch (error) {
  console.error('Failed to create JWKS endpoint:', error);
  console.log('JWT verification will be disabled');
}

declare module 'fastify' {
  interface FastifyRequest { userId?: string; token?: string }
}

app.get('/healthz', async () => ({ ok: true }));

// Debug endpoint to test JWT verification
app.get('/debug/auth', async (req, reply) => {
  return reply.send({
    hasAuthHeader: !!req.headers.authorization,
    authHeader: req.headers.authorization,
    userId: req.userId,
    hasToken: !!req.token,
    tokenPreview: req.token ? req.token.substring(0, 20) + '...' : null,
    supabaseUrl: env.SUPABASE_URL,
    jwksUrl: `${env.SUPABASE_URL}/auth/v1/keys`
  });
});

// Debug endpoint to test Supabase connection
app.get('/debug/supabase', async (req, reply) => {
  try {
    const { data, error } = await supabaseService.from('profiles').select('count').limit(1);
    return reply.send({
      supabaseConnected: !error,
      error: error?.message,
      supabaseUrl: env.SUPABASE_URL
    });
  } catch (err) {
    return reply.send({
      supabaseConnected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      supabaseUrl: env.SUPABASE_URL
    });
  }
});

app.addHook('preHandler', async (req, _res) => {
  const auth = req.headers.authorization;
  
  if (!auth?.startsWith('Bearer ')) {
    return; // allow public endpoints
  }
  const token = auth.slice(7);
  
  // Only try JWT verification if JWKS is available
  if (!jwks) {
    // JWKS not available, extract user ID from token payload without verification
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload.sub) {
          req.userId = payload.sub;
          req.token = token;
        }
      }
    } catch (payloadError) {
      // Failed to extract payload, leave unauthenticated
    }
    return;
  }
  
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated'
    });
    req.userId = (payload as any).sub as string;
    req.token = token;
  } catch (error) {
    // JWT verification failed, try to extract user ID from token payload as fallback
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload.sub) {
          req.userId = payload.sub;
          req.token = token;
        }
      }
    } catch (payloadError) {
      // Failed to extract payload, leave unauthenticated
    }
  }
});

await registerRoutes(app);
await intakeQuestions(app);
await intakeAnswer(app);
await wimtsGen(app);
await wimtsSelect(app);
await translateGen(app);
await profileGet(app);
await contactsCreate(app);
await contactsList(app);
await contactsGet(app);
await contactsSliders(app);
await insightsLike(app);
await insightsWeekly(app);
await shareShortlink(app);
await shareCard(app);
await shareWall(app);
await pairInvite(app);
await pairComplete(app);
await adminConfigGet(app);
app.addHook('preValidation', async (req, reply) => {
  if (req.routerPath?.startsWith('/api/admin')) {
    const ok = await requireAdmin(req, reply);
    if (!ok) return reply; // stop
  }
});
await adminConfigPut(app);
await adminConfigPublish(app);
await adminVersionsList(app);
await adminVersionsGet(app);
await adminModerationDecision(app);
await reflectionsSimilar(app);
await analyticsIngest(app);
await claimSession(app);

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});


