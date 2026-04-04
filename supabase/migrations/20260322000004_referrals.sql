-- Referral codes table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  max_uses INTEGER DEFAULT 10,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral codes"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert their own referral codes"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Anyone can look up a referral code to validate it"
  ON public.referrals FOR SELECT
  USING (true);

-- Referral uses table (tracks who used which code)
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_at TIMESTAMPTZ DEFAULT now(),
  has_used_tool BOOLEAN DEFAULT false,
  tools_used JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer can view their referral uses"
  ON public.referral_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.id = referral_id AND r.referrer_id = auth.uid()
    )
  );

CREATE POLICY "System can insert referral uses"
  ON public.referral_uses FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

CREATE POLICY "User can update their own referral use"
  ON public.referral_uses FOR UPDATE
  USING (auth.uid() = referred_user_id);

-- Add referred_by column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a referral code for a new user automatically
CREATE OR REPLACE FUNCTION create_referral_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Generate a unique code
  LOOP
    new_code := generate_referral_code();
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert the referral code
  INSERT INTO public.referrals (referrer_id, code)
  VALUES (NEW.id, new_code);

  -- Save the code to the user's profile
  UPDATE public.profiles
  SET referral_code = new_code
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create referral code when new user is created
DROP TRIGGER IF EXISTS on_new_user_create_referral ON auth.users;
CREATE TRIGGER on_new_user_create_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_for_new_user();

-- Function to increment referral use count
CREATE OR REPLACE FUNCTION increment_referral_uses(ref_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.referrals
  SET current_uses = current_uses + 1
  WHERE id = ref_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;