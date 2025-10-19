import { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseService } from '../lib/supabase';

export async function requireRole(req: FastifyRequest, reply: FastifyReply, roles: string[]) {
  if (!req.userId) {
    reply.code(401).send({ error: 'unauthorized' });
    return false;
  }
  const { data, error } = await supabaseService
    .from('user_roles')
    .select('role')
    .eq('user_id', req.userId)
    .maybeSingle();
  if (error || !data || !roles.includes(data.role)) {
    reply.code(403).send({ error: 'forbidden' });
    return false;
  }
  return true;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  return requireRole(req, reply, ['admin', 'editor']);
}

