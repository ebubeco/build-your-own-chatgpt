CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text,
  hardware text,
  model text,
  confidence integer,
  career text,
  timestamp timestamptz DEFAULT now()
);
