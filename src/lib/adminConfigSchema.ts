import { z } from 'zod';

/**
 * Zod validation schema for admin configuration
 * Used for validating config updates from admin panel
 */
export const AdminConfigPayloadSchema = z.object({
  cognitive: z.object({
    axis_weights: z.object({
      N: z.number().min(0).max(2),
      S: z.number().min(0).max(2),
      T: z.number().min(0).max(2),
      F: z.number().min(0).max(2),
    }),
    shadow_factor: z.number().min(0).max(1),
    trigger_threshold: z.number().min(0).max(1),
    blindspot_decay_rate: z.number().min(0).max(1),
  }),
  fear: z.object({
    weights: z.object({
      unworthiness: z.number().min(0).max(2),
      unlovability: z.number().min(0).max(2),
      powerlessness: z.number().min(0).max(2),
      unsafety: z.number().min(0).max(2),
    }),
    recency_decay: z.object({
      half_life_days: z.number().int().positive(),
    }),
    heat_map_gradient: z
      .array(z.number().min(0).max(1))
      .length(4)
      .refine(
        (arr) => {
          for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] >= arr[i + 1]) return false;
          }
          return true;
        },
        { message: 'Heat map gradient must be in ascending order' }
      ),
  }),
  intake: z.object({
    flow: z
      .object({
        min_cards: z.number().int().positive(),
        max_cards: z.number().int().positive(),
        summary_confirm_min_confidence: z.number().min(0).max(1),
      })
      .refine((data) => data.min_cards <= data.max_cards, {
        message: 'min_cards must be <= max_cards',
        path: ['min_cards'],
      }),
    intensity: z.object({
      up: z.number().positive(),
      down: z.number().positive(),
      neither: z.number().positive(),
    }),
    functions: z.object({
      Se: z.number().min(0).max(2),
      Ne: z.number().min(0).max(2),
      Si: z.number().min(0).max(2),
      Ni: z.number().min(0).max(2),
      Te: z.number().min(0).max(2),
      Ti: z.number().min(0).max(2),
      Fe: z.number().min(0).max(2),
      Fi: z.number().min(0).max(2),
    }),
  }),
  translator: z.object({
    default_mode: z.enum(['4', '8']),
    enable_advanced: z.boolean(),
  }),
  share: z.object({
    card_templates: z.array(z.string()),
    public_wall_enabled: z.boolean(),
  }),
  ui: z.object({
    animation_speed_factor: z.number().positive(),
    bar_display_limit: z.number().int().positive(),
    theme_palette: z.string(),
  }),
});

export type AdminConfigPayload = z.infer<typeof AdminConfigPayloadSchema>;

