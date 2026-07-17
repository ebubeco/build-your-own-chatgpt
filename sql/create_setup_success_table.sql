CREATE TABLE IF NOT EXISTS setup_success (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text,
  goal text,
  hardware text,
  success text,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security is REQUIRED here. The Supabase key shipped in analytics.js
-- is a public/publishable key (visible in page source), so without RLS anyone
-- could SELECT everything in this table or DELETE all of it. The site only ever
-- inserts feedback rows, so grant the anon role INSERT and nothing else.
ALTER TABLE setup_success ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert only" ON setup_success;
CREATE POLICY "anon insert only" ON setup_success
  FOR INSERT TO anon
  WITH CHECK (true);
