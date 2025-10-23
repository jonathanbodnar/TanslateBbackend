import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseService } from '../../lib/supabase';
import { requireAdmin } from '../../lib/adminMiddleware';
import { AdminConfigPayloadSchema } from '../../lib/adminConfigSchema';

const UpdateConfigBody = z.object({
  payload: AdminConfigPayloadSchema,
  notes: z.string().optional(),
});

/**
 * PUT /api/admin/config
 * Update the admin configuration (overwrites current)
 * Requires admin role
 */
export default async function register(app: FastifyInstance) {
  app.put(
    '/api/admin/config',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      try {
        // Validate request body
        const body = UpdateConfigBody.parse(req.body);

        // Upsert the config (overwrite current)
        const { data: updatedConfig, error: upsertError } =
          await supabaseService
            .from('admin_configs')
            .upsert(
              {
                config_id: 'current',
                payload: body.payload,
                author_user_id: req.userId,
                notes: body.notes || null,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'config_id',
              }
            )
            .select()
            .single();

        if (upsertError) {
          console.error('Error updating config:', upsertError);
          return reply.code(500).send({ error: 'Failed to save config' });
        }

        console.log(
          `Admin config updated by user ${req.userId}${body.notes ? `: ${body.notes}` : ''}`
        );

        // TODO: Emit event for hot-reload
        // This could trigger a websocket notification or other mechanism
        // to notify the app that config has changed
        // app.emit('admin.config.updated');

        return reply.send({
          ...updatedConfig,
          validation_errors: [],
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          console.error('Config validation failed:', err.errors);
          return reply.code(400).send({
            error: 'Validation failed',
            validation_errors: err.errors,
          });
        }
        console.error('Error in PUT /api/admin/config:', err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

