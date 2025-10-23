-- Seed data for MVP

-- Insert questions (replacing static data)
INSERT INTO public.questions (id, headline, left_label, right_label, helper_text, category, order_index, is_active) VALUES
('Q1', 'Which pressure felt bigger?', 'Put on the spot now', 'Too many moving parts', 'Live vs unknowns.', 'communication', 1, true),
('Q2', 'What kind of judgment landed?', 'Wanted exact steps & proof', 'Made it about what this means', 'Proof vs meaning.', 'communication', 2, true),
('Q4', 'Which sounds more like it?', 'We''re okay', 'Lock steps', 'Pick one.', 'relationship', 3, true),
('Q5', 'Biggest fear here?', 'Not included', 'Not capable', 'Connection vs competence.', 'fear', 4, true),
('Q6', 'What stung more?', 'Freedom boxed', 'Felt unstable', 'Tie-breaker.', 'personality', 5, true)
ON CONFLICT (id) DO UPDATE SET
  headline = EXCLUDED.headline,
  left_label = EXCLUDED.left_label,
  right_label = EXCLUDED.right_label,
  helper_text = EXCLUDED.helper_text,
  category = EXCLUDED.category,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create default admin user role (replace with actual admin user ID)
-- INSERT INTO public.user_roles (user_id, role) VALUES 
-- ('00000000-0000-0000-0000-000000000000', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;