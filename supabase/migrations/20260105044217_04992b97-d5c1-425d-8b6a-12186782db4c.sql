-- Drop the existing restrictive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new policy that allows users to view their own profile OR admins to view all
CREATE POLICY "Users can view own profile or admins view all" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id OR is_admin(auth.uid()));