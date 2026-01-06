-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create a new policy using the is_admin security definer function
CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));