CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text,
  hardware text,
  model text,
  confidence integer,
  career text,
  timestamp timestamptz DEFAULT now()
);

-- Row Level Security is REQUIRED here. The Supabase key shipped in analytics.js
-- is a public/publishable key (visible in page source), so without RLS anyone
-- could SELECT everything in this table or DELETE all of it. The site only ever
-- inserts analytics rows, so grant the anon role INSERT and nothing else.
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert only" ON recommendations;
CREATE POLICY "anon insert only" ON recommendations
  FOR INSERT TO anon
  WITH CHECK (true);
