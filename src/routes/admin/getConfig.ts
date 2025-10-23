import { FastifyInstance } from 'fastify';
import { supabaseService } from '../../lib/supabase';
import { requireAdmin } from '../../lib/adminMiddleware';

/**
 * GET /api/admin/config
 * Fetch the current admin configuration
 * Requires admin role
 */
export default async function register(app: FastifyInstance) {
  app.get(
    '/api/admin/config',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        const { data, error } = await supabaseService
          .from('admin_configs')
          .select('*')
          .eq('config_id', 'current')
          .single();

        if (error) {
          console.error('Error fetching admin config:', error);
          return reply.code(404).send({ error: 'Config not found' });
        }

        if (!data) {
          return reply.code(404).send({ error: 'Config not found' });
        }

        return reply.send(data);
      } catch (err) {
        console.error('Error in GET /api/admin/config:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

