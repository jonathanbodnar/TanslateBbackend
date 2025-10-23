import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseService } from './supabase';

/**
 * Middleware to require admin role for protected routes
 * Checks user metadata for role='admin'
 */
export async function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Check if user is authenticated
  if (!req.userId) {
    reply.code(401).send({ error: 'Unauthorized: Authentication required' });
    return;
  }

  try {
    // Use Auth Admin API to fetch user
    const { data, error } = await supabaseService.auth.admin.getUserById(
      req.userId
    );

    if (error || !data?.user) {
      console.error('Error fetching user for admin check:', error);
      reply.code(401).send({ error: 'Unauthorized: User not found' });
      return;
    }

    const user = data.user;
    
    // Check both possible locations for the role
    const role = user.user_metadata?.role || (user as any).raw_user_meta_data?.role;

    if (role !== 'admin') {
      console.warn(`Admin access denied for user ${req.userId}: role=${role}`);
      reply
        .code(403)
        .send({ error: 'Forbidden: Admin access required' });
      return;
    }

    // User is admin, allow request to proceed
  } catch (err) {
    console.error('Error in requireAdmin middleware:', err);
    reply.code(500).send({ error: 'Internal server error' });
  }
}

