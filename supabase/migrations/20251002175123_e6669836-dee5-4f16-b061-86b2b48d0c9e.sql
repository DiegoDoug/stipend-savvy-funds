-- Update profiles table structure for account management
-- Remove unnecessary columns and add required ones

-- First, drop the old id column if it exists (user_id should be the PK)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS id;

-- Remove email column (source of truth is auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Rename display_name to name if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN display_name TO name;
  END IF;
END $$;

-- Add name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN name text;
  END IF;
END $$;

-- Add status column with default 'active'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_status_check
    CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Add last_login column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Ensure user_id is the primary key
DO $$
BEGIN
  -- Drop existing primary key if it's on id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' 
    AND constraint_type = 'PRIMARY KEY'
    AND constraint_name != 'profiles_pkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
  END IF;
  
  -- Add primary key on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' 
    AND constraint_type = 'PRIMARY KEY'
    AND constraint_name = 'profiles_pkey'
  ) THEN
    ALTER TABLE public.profiles ADD PRIMARY KEY (user_id);
  END IF;
END $$;

-- Update handle_new_user function to use new structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      NEW.raw_user_meta_data->>'name', 
      split_part(NEW.email, '@', 1)
    ),
    'active'
  );
  RETURN NEW;
END;
$$;

-- Create function to update last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_login ON auth.users;

-- Create trigger to update last_login on user login
CREATE TRIGGER on_auth_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();