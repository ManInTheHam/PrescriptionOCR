-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;

-- Create new policies that work with signup
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile during signup
-- This policy allows insertion when the user ID matches the authenticated user
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Alternative policy for signup process - allows any authenticated user to insert
-- This is needed because sometimes the auth.uid() might not be immediately available
CREATE POLICY "Enable profile creation for authenticated users" ON profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
