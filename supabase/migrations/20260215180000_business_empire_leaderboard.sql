-- Business Empire Game - Forbes Leaderboard Table
-- This table stores user net worth for the global leaderboard

CREATE TABLE IF NOT EXISTS business_empire_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  net_worth DECIMAL(20, 2) DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_earned DECIMAL(20, 2) DEFAULT 0,
  highest_card TEXT DEFAULT 'Student Card',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster leaderboard queries sorted by net worth
CREATE INDEX IF NOT EXISTS idx_business_empire_net_worth ON business_empire_profiles(net_worth DESC);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_business_empire_user_id ON business_empire_profiles(user_id);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_business_empire_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on row update
CREATE TRIGGER update_business_empire_profiles_timestamp
  BEFORE UPDATE ON business_empire_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_business_empire_timestamp();

-- Enable Row Level Security
ALTER TABLE business_empire_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles (for leaderboard)
CREATE POLICY "Enable read access for all users" ON business_empire_profiles
  FOR SELECT USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Enable insert for authenticated users" ON business_empire_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Enable update for own user" ON business_empire_profiles
  FOR UPDATE USING (auth.uid() = user_id);
