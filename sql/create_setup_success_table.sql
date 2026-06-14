CREATE TABLE IF NOT EXISTS setup_success (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text,
  goal text,
  hardware text,
  success text,
  created_at timestamptz DEFAULT now()
);
